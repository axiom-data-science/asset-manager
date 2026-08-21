import type { JSONSchema6, JSONSchema6Definition } from 'json-schema'

export type EnumMode =
  /** { type: "string", enum: [...] } */
  | 'enum-only'
  /** { anyOf: [{ type: "string", enum: [...] }, { type: "string" }] } */
  | 'enum-or-string'
  /** { anyOf: [{ type: "string", enum: [...] }, { type: "string" }, { type: "null" }] } */
  | 'enum-or-string-or-null'

export type EnumProperty = {
  /** Path segments that navigate to the property node inside the schema, e.g. ['properties', 'address', 'properties', 'city'] */
  path: string[]
  /** The key name of the property */
  name: string
  /** The enum values found on the property */
  enum: JSONSchema6['enum']
  /** Whether the property currently accepts only enum values, enum-or-any-string, or enum-or-string-or-null */
  mode: EnumMode
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function detectEnumNode(
  node: JSONSchema6
): { found: true; mode: EnumMode; enumValues: JSONSchema6['enum'] } | { found: false } {
  // Direct string enum: { type: "string", enum: [...] }
  if (node.type === 'string' && Array.isArray(node.enum) && node.enum.length > 0) {
    return { found: true, mode: 'enum-only', enumValues: node.enum }
  }

  // anyOf containing a string-enum variant
  if (Array.isArray(node.anyOf)) {
    const enumVariant = node.anyOf.find(
      (s): s is JSONSchema6 =>
        typeof s !== 'boolean' &&
        s.type === 'string' &&
        Array.isArray(s.enum) &&
        (s.enum?.length ?? 0) > 0
    )
    if (enumVariant) {
      const hasNull = node.anyOf.some((s) => typeof s !== 'boolean' && s.type === 'null')
      const hasOpenString = node.anyOf.some(
        (s) => typeof s !== 'boolean' && s.type === 'string' && !Array.isArray(s.enum)
      )
      if (hasNull)
        return { found: true, mode: 'enum-or-string-or-null', enumValues: enumVariant.enum }
      if (hasOpenString)
        return { found: true, mode: 'enum-or-string', enumValues: enumVariant.enum }
      return { found: true, mode: 'enum-only', enumValues: enumVariant.enum }
    }
  }

  return { found: false }
}

/** Extract enum values from a node regardless of its current mode. */
function extractEnumValues(node: Record<string, unknown>): unknown[] {
  if (Array.isArray(node['enum'])) return node['enum'] as unknown[]
  if (Array.isArray(node['anyOf'])) {
    const enumVariant = (node['anyOf'] as unknown[]).find(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        (s as Record<string, unknown>)['type'] === 'string' &&
        Array.isArray((s as Record<string, unknown>)['enum'])
    ) as Record<string, unknown> | undefined
    if (enumVariant) return enumVariant['enum'] as unknown[]
  }
  return []
}

/** Return a copy of the node with `type`, `enum`, and `anyOf` removed so they can be rebuilt cleanly. */
function stripEnumStructure(node: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(node).filter(([k]) => k !== 'type' && k !== 'enum' && k !== 'anyOf')
  )
}

/** Navigate a cloned schema to the parent of `path` and return `{ parent, lastKey }`. */
function navigateToParent(
  clone: Record<string, unknown>,
  path: string[]
): { parent: Record<string, unknown>; lastKey: string } {
  let parent = clone
  for (const key of path.slice(0, -1)) {
    parent = parent[key] as Record<string, unknown>
  }
  return { parent, lastKey: path[path.length - 1] }
}

// ---------------------------------------------------------------------------
// Walker
// ---------------------------------------------------------------------------

function walk(
  node: JSONSchema6Definition,
  currentPath: string[],
  name: string,
  results: EnumProperty[],
  visited: Set<JSONSchema6Definition>
): void {
  if (typeof node === 'boolean') return
  if (visited.has(node)) return
  visited.add(node)

  // Record this node if it is (or wraps) a string enum in any supported shape
  const detected = detectEnumNode(node)
  if (detected.found) {
    results.push({ path: currentPath, name, enum: detected.enumValues, mode: detected.mode })
    // Leaf — no need to recurse further
    return
  }

  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      walk(child, [...currentPath, 'properties', key], key, results, visited)
    }
  }

  if (node.definitions) {
    for (const [key, child] of Object.entries(node.definitions)) {
      walk(child, [...currentPath, 'definitions', key], key, results, visited)
    }
  }

  if (node.items) {
    if (Array.isArray(node.items)) {
      node.items.forEach((item, i) =>
        walk(item, [...currentPath, 'items', String(i)], name, results, visited)
      )
    } else {
      walk(node.items, [...currentPath, 'items'], name, results, visited)
    }
  }

  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    node[combiner]?.forEach((sub, i) =>
      walk(sub, [...currentPath, combiner, String(i)], name, results, visited)
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Traverse a JSON Schema and return every string property that has an `enum`.
 * Each result includes the full path to the property node, its name, enum values,
 * and the current `mode` describing whether the property is strict-enum-only,
 * enum-or-any-string, or enum-or-string-or-null.
 */
export function findEnumProperties(schema: JSONSchema6): EnumProperty[] {
  const results: EnumProperty[] = []
  walk(schema, [], '', results, new Set())
  return results
}

/**
 * Return a new schema with the enum constraint fully removed from the property at `path`,
 * leaving a plain `{ type: "string" }`. Works regardless of the property's current mode.
 * The original schema is not mutated.
 */
export function removeEnumAtPath(schema: JSONSchema6, path: string[]): JSONSchema6 {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  const { parent, lastKey } = navigateToParent(clone, path)
  const node = parent[lastKey] as Record<string, unknown>
  parent[lastKey] = { ...stripEnumStructure(node), type: 'string' }
  return clone as JSONSchema6
}

/**
 * Return a new schema where the property at `path` accepts either one of the known
 * enum values OR any arbitrary string. Idempotent — calling it twice does not nest.
 *
 * Result: `{ anyOf: [{ type: "string", enum: [...] }, { type: "string" }] }`
 */
export function convertEnumToOpenStringAtPath(schema: JSONSchema6, path: string[]): JSONSchema6 {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  const { parent, lastKey } = navigateToParent(clone, path)
  const node = parent[lastKey] as Record<string, unknown>
  const enumValues = extractEnumValues(node)
  parent[lastKey] = {
    ...stripEnumStructure(node),
    anyOf: [{ type: 'string', enum: enumValues }, { type: 'string' }],
  }
  return clone as JSONSchema6
}

/**
 * Return a new schema where the property at `path` accepts one of the known enum values,
 * any arbitrary string, or null (making the field nullable / optional).
 * Idempotent — calling it twice does not nest.
 *
 * Result: `{ anyOf: [{ type: "string", enum: [...] }, { type: "string" }, { type: "null" }] }`
 */
export function convertEnumToOptionalStringAtPath(
  schema: JSONSchema6,
  path: string[]
): JSONSchema6 {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  const { parent, lastKey } = navigateToParent(clone, path)
  const node = parent[lastKey] as Record<string, unknown>
  const enumValues = extractEnumValues(node)
  parent[lastKey] = {
    ...stripEnumStructure(node),
    anyOf: [{ type: 'string', enum: enumValues }, { type: 'string' }, { type: 'null' }],
  }
  return clone as JSONSchema6
}

/**
 * Return a new schema where the property at `path` is converted back to a strict enum-only
 * constraint, removing any open-string or null variants that were previously added.
 * Idempotent — safe to call on an already strict-enum property.
 *
 * Result: `{ type: "string", enum: [...] }`
 */
export function convertToEnumOnlyAtPath(schema: JSONSchema6, path: string[]): JSONSchema6 {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  const { parent, lastKey } = navigateToParent(clone, path)
  const node = parent[lastKey] as Record<string, unknown>
  const enumValues = extractEnumValues(node)
  parent[lastKey] = {
    ...stripEnumStructure(node),
    type: 'string',
    enum: enumValues,
  }
  return clone as JSONSchema6
}
