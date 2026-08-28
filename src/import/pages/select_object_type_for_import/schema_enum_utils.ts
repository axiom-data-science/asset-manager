import type { JSONSchema6, JSONSchema6Definition } from ***REMOVED***json-schema***REMOVED***

export type EnumMode =
  /** { type: "string", enum: [...] } */
  | ***REMOVED***enum-only***REMOVED***
  /** { anyOf: [{ type: "string", enum: [...] }, { type: "string" }] } */
  | ***REMOVED***enum-or-string***REMOVED***
  /** { anyOf: [{ type: "string", enum: [...] }, { type: "string" }, { type: "null" }] } */
  | ***REMOVED***enum-or-string-or-null***REMOVED***

export type EnumProperty = {
  /** Path segments that navigate to the property node inside the schema, e.g. [***REMOVED***properties***REMOVED***, ***REMOVED***address***REMOVED***, ***REMOVED***properties***REMOVED***, ***REMOVED***city***REMOVED***] */
  path: string[]
  /** The key name of the property */
  name: string
  /** The enum values found on the property */
  enum: JSONSchema6[***REMOVED***enum***REMOVED***]
  /** Whether the property currently accepts only enum values, enum-or-any-string, or enum-or-string-or-null */
  mode: EnumMode
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function detectEnumNode(
  node: JSONSchema6
): { found: true; mode: EnumMode; enumValues: JSONSchema6[***REMOVED***enum***REMOVED***] } | { found: false } {
  // Direct string enum: { type: "string", enum: [...] }
  if (node.type === ***REMOVED***string***REMOVED*** && Array.isArray(node.enum) && node.enum.length > 0) {
    return { found: true, mode: ***REMOVED***enum-only***REMOVED***, enumValues: node.enum }
  }

  // anyOf containing a string-enum variant
  if (Array.isArray(node.anyOf)) {
    const enumVariant = node.anyOf.find(
      (s): s is JSONSchema6 =>
        typeof s !== ***REMOVED***boolean***REMOVED*** &&
        s.type === ***REMOVED***string***REMOVED*** &&
        Array.isArray(s.enum) &&
        (s.enum?.length ?? 0) > 0
    )
    if (enumVariant) {
      const hasNull = node.anyOf.some((s) => typeof s !== ***REMOVED***boolean***REMOVED*** && s.type === ***REMOVED***null***REMOVED***)
      const hasOpenString = node.anyOf.some(
        (s) => typeof s !== ***REMOVED***boolean***REMOVED*** && s.type === ***REMOVED***string***REMOVED*** && !Array.isArray(s.enum)
      )
      if (hasNull)
        return { found: true, mode: ***REMOVED***enum-or-string-or-null***REMOVED***, enumValues: enumVariant.enum }
      if (hasOpenString)
        return { found: true, mode: ***REMOVED***enum-or-string***REMOVED***, enumValues: enumVariant.enum }
      return { found: true, mode: ***REMOVED***enum-only***REMOVED***, enumValues: enumVariant.enum }
    }
  }

  return { found: false }
}

/** Extract enum values from a node regardless of its current mode. */
function extractEnumValues(node: Record<string, unknown>): unknown[] {
  if (Array.isArray(node[***REMOVED***enum***REMOVED***])) return node[***REMOVED***enum***REMOVED***] as unknown[]
  if (Array.isArray(node[***REMOVED***anyOf***REMOVED***])) {
    const enumVariant = (node[***REMOVED***anyOf***REMOVED***] as unknown[]).find(
      (s) =>
        typeof s === ***REMOVED***object***REMOVED*** &&
        s !== null &&
        (s as Record<string, unknown>)[***REMOVED***type***REMOVED***] === ***REMOVED***string***REMOVED*** &&
        Array.isArray((s as Record<string, unknown>)[***REMOVED***enum***REMOVED***])
    ) as Record<string, unknown> | undefined
    if (enumVariant) return enumVariant[***REMOVED***enum***REMOVED***] as unknown[]
  }
  return []
}

/** Return a copy of the node with `type`, `enum`, and `anyOf` removed so they can be rebuilt cleanly. */
function stripEnumStructure(node: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(node).filter(([k]) => k !== ***REMOVED***type***REMOVED*** && k !== ***REMOVED***enum***REMOVED*** && k !== ***REMOVED***anyOf***REMOVED***)
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
  if (typeof node === ***REMOVED***boolean***REMOVED***) return
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
      walk(child, [...currentPath, ***REMOVED***properties***REMOVED***, key], key, results, visited)
    }
  }

  if (node.definitions) {
    for (const [key, child] of Object.entries(node.definitions)) {
      walk(child, [...currentPath, ***REMOVED***definitions***REMOVED***, key], key, results, visited)
    }
  }

  if (node.items) {
    if (Array.isArray(node.items)) {
      node.items.forEach((item, i) =>
        walk(item, [...currentPath, ***REMOVED***items***REMOVED***, String(i)], name, results, visited)
      )
    } else {
      walk(node.items, [...currentPath, ***REMOVED***items***REMOVED***], name, results, visited)
    }
  }

  for (const combiner of [***REMOVED***allOf***REMOVED***, ***REMOVED***anyOf***REMOVED***, ***REMOVED***oneOf***REMOVED***] as const) {
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
  walk(schema, [], ***REMOVED******REMOVED***, results, new Set())
  return results
}

/**
 * Return a new schema with the enum constraint fully removed from the property at `path`,
 * leaving a plain `{ type: "string" }`. Works regardless of the property***REMOVED***s current mode.
 * The original schema is not mutated.
 */
export function removeEnumAtPath(schema: JSONSchema6, path: string[]): JSONSchema6 {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  const { parent, lastKey } = navigateToParent(clone, path)
  const node = parent[lastKey] as Record<string, unknown>
  parent[lastKey] = { ...stripEnumStructure(node), type: ***REMOVED***string***REMOVED*** }
  return clone as JSONSchema6
}

export function removeAllEnumAtPath(schema: JSONSchema6, paths: string[][]): JSONSchema6 {
  let updatedSchema = schema
  for (const path of paths) {
    updatedSchema = removeEnumAtPath(updatedSchema, path)
  }
  return updatedSchema
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
    anyOf: [{ type: ***REMOVED***string***REMOVED***, enum: enumValues }, { type: ***REMOVED***string***REMOVED*** }],
  }
  return clone as JSONSchema6
}

export function convertAllEnumToOpenStringAtPath(
  schema: JSONSchema6,
  paths: string[][]
): JSONSchema6 {
  let updatedSchema = schema
  for (const path of paths) {
    updatedSchema = convertEnumToOpenStringAtPath(updatedSchema, path)
  }
  return updatedSchema
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
    anyOf: [{ type: ***REMOVED***string***REMOVED***, enum: enumValues }, { type: ***REMOVED***string***REMOVED*** }, { type: ***REMOVED***null***REMOVED*** }],
  }
  return clone as JSONSchema6
}

export function convertAllEnumToOptionalStringAtPath(
  schema: JSONSchema6,
  paths: string[][]
): JSONSchema6 {
  let updatedSchema = schema
  for (const path of paths) {
    updatedSchema = convertEnumToOptionalStringAtPath(updatedSchema, path)
  }
  return updatedSchema
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
    type: ***REMOVED***string***REMOVED***,
    enum: enumValues,
  }
  return clone as JSONSchema6
}


export function convertAllToEnumOnlyAtPath(schema: JSONSchema6, paths: string[][]): JSONSchema6 {
  let updatedSchema = schema
  for (const path of paths) {
    updatedSchema = convertToEnumOnlyAtPath(updatedSchema, path)
  }
  return updatedSchema
}
