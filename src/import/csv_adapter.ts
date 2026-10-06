import { parseCSV, type ParsedCSV } from '@/lib/csv'
import type {
  CanonicalImportRecord,
  ImportArraySourceTarget,
  ImportCandidate,
  ImportSourceAdapter,
} from './types'
import type { IObjectTypeFieldMappings } from '@/types/types'
import type { JSONSchema6 } from 'json-schema'
import { get } from 'lodash-es'

export type CSVImportMapping = {
  label?: string
  slug?: string
  externalId?: string
  description?: string
  dataColumns?: string[]
  fieldMappings?: Record<string, string>
}

export type CSVSchemaField = {
  id: string
  path: string
  title: string
  required: boolean
}

const resolveLocalSchemaRefs = (
  schema: unknown,
  root: unknown,
  refStack = new Set<string>()
): unknown => {
  if (Array.isArray(schema))
    return schema.map((value) => resolveLocalSchemaRefs(value, root, refStack))
  if (schema === null || typeof schema !== 'object') return schema

  let resolved = schema as Record<string, unknown>
  const reference = resolved.$ref
  if (typeof reference === 'string' && reference.startsWith('#/') && !refStack.has(reference)) {
    const target = reference
      .slice(2)
      .split('/')
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce<unknown>((current, part) =>
        current !== null && typeof current === 'object'
          ? (current as Record<string, unknown>)[part]
          : undefined, root)
    if (target !== null && typeof target === 'object' && !Array.isArray(target)) {
      const nextRefStack = new Set(refStack).add(reference)
      const siblings = Object.fromEntries(
        Object.entries(resolved).filter(([key]) => key !== '$ref')
      )
      resolved = resolveLocalSchemaRefs(
        { ...(target as Record<string, unknown>), ...siblings },
        root,
        nextRefStack
      ) as Record<string, unknown>
      return resolved
    }
  }

  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [
      key,
      resolveLocalSchemaRefs(value, root, refStack),
    ])
  )
}

const getCSVSchemaFieldsFromResolved = (
  schema: JSONSchema6 | undefined,
  parentPath: string,
  branchSelections: Record<string, string>
): CSVSchemaField[] => {
  if (!schema?.properties || typeof schema.properties !== 'object') return []
  const requiredFields = new Set(schema.required ?? [])

  return Object.entries(schema.properties)
    .flatMap(([id, property]) => {
      if (!property || typeof property === 'boolean') return []
      const path = parentPath ? `${parentPath}.${id}` : id
      const title = typeof property.title === 'string' ? property.title : id
      const selectedBranch = branchSelections[path]
      const branches = property.oneOf?.filter((branch): branch is JSONSchema6 => {
        if (typeof branch === 'boolean') return false
        if (!selectedBranch) return true
        const typeProperty = branch.properties?.type
        return Boolean(
          typeProperty && typeof typeProperty !== 'boolean' && typeProperty.const === selectedBranch
        )
      })
      const nestedFields = branches?.length
        ? branches.flatMap((branch) =>
          getCSVSchemaFieldsFromResolved(branch, path, branchSelections)
        )
        : getCSVSchemaFieldsFromResolved(property, path, branchSelections)
      const arrayItem = Array.isArray(property.items) ? property.items[0] : property.items
      const scalarArrayItem =
        arrayItem && typeof arrayItem !== 'boolean' && !arrayItem.properties
      const arrayFields =
        arrayItem && typeof arrayItem !== 'boolean' && !scalarArrayItem
          ? getCSVSchemaFieldsFromResolved(arrayItem, `${path}[]`, branchSelections)
          : []
      const fieldPath = scalarArrayItem ? `${path}[]` : path
      return [
        { id, path: fieldPath, title, required: requiredFields.has(id) },
        ...nestedFields,
        ...arrayFields,
      ]
    })
    .sort((left, right) => Number(right.required) - Number(left.required))
}

export const getCSVSchemaFields = (
  schema: JSONSchema6 | undefined,
  parentPath = '',
  branchSelections: Record<string, string> = {}
): CSVSchemaField[] => {
  if (!schema) return []
  const resolved = resolveLocalSchemaRefs(schema, schema) as JSONSchema6
  return getCSVSchemaFieldsFromResolved(resolved, parentPath, branchSelections)
}

export const getCSVSchemaAtPath = (
  schema: JSONSchema6 | undefined,
  path: string
): JSONSchema6 | undefined => {
  let current = schema
  for (const segment of path.split('.')) {
    const arraySegment = segment.endsWith('[]')
    const propertyName = arraySegment ? segment.slice(0, -2) : segment
    const property = current?.properties?.[propertyName]
    if (!property || typeof property === 'boolean') return undefined
    current = property
    if (arraySegment) {
      const itemSchema = Array.isArray(current.items) ? current.items[0] : current.items
      if (!itemSchema || typeof itemSchema === 'boolean') return undefined
      current = itemSchema
    }
  }
  return current
}

export const getCSVArrayItemSchema = (
  schema: JSONSchema6 | undefined,
  arrayFieldPath: string
): JSONSchema6 | undefined => {
  const arraySchema = getCSVSchemaAtPath(schema, arrayFieldPath)
  if (!arraySchema?.items || typeof arraySchema.items === 'boolean') return undefined
  const itemSchema = Array.isArray(arraySchema.items) ? arraySchema.items[0] : arraySchema.items
  return itemSchema && typeof itemSchema !== 'boolean' ? itemSchema : undefined
}

export const inferCSVSchemaFieldMappings = (
  columns: string[],
  schema: JSONSchema6 | undefined,
  branchSelections: Record<string, string> = {}
): Record<string, string> => {
  const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const schemaFields = getCSVSchemaFields(schema, '', branchSelections)
  return Object.fromEntries(
    columns
      .map((column) => {
        const field = schemaFields.find(
          (candidate) =>
            normalize(candidate.id) === normalize(column) ||
            normalize(candidate.path) === normalize(column)
        )
        return field ? [column, field.path] : null
      })
      .filter((entry): entry is [string, string] => entry !== null)
  )
}

export const getAvailableCSVSchemaFieldPaths = (
  mapping: CSVImportMapping,
  column: string
): Set<string> =>
  new Set(
    Object.entries(mapping.fieldMappings ?? {})
      .filter(([mappedColumn]) => mappedColumn !== column)
      .map(([, fieldPath]) => fieldPath)
  )

export type CSVImportAdapterOptions = {
  id: string
  label?: string
  text: string
  mapping?: CSVImportMapping
  relationshipRules?: ImportSourceAdapter['relationshipRules']
  relationshipFields?: string[]
  arrayTarget?: ImportArraySourceTarget
  fixedFields?: Record<string, unknown>
  fieldMappings?: IObjectTypeFieldMappings
  sourceKey?: string
  schema?: JSONSchema6
}

export const isCSVImportMappingComplete = (
  headers: string[],
  mapping: CSVImportMapping
): boolean => {
  const mappedColumns = new Set(
    [
      mapping.label,
      mapping.slug,
      mapping.externalId,
      mapping.description,
      ...(mapping.dataColumns ?? []),
    ].filter((column): column is string => Boolean(column))
  )
  return headers.every((header) => mappedColumns.has(header))
}

const findHeader = (headers: string[], names: string[]): string | undefined => {
  const normalized = new Map(
    headers.map((header) => [header.toLowerCase().replace(/[^a-z0-9]/g, ''), header])
  )
  return names.map((name) => normalized.get(name)).find((header) => header !== undefined)
}

export const inferCSVImportMapping = (headers: string[]): CSVImportMapping => {
  const label = findHeader(headers, ['label', 'name', 'title'])
  const slug = findHeader(headers, ['slug', 'identifier', 'id'])
  const externalId = findHeader(headers, ['externalid', 'externalcode', 'uuid', 'id'])
  const description = findHeader(headers, ['description', 'summary', 'details'])
  const specialColumns = new Set([label, slug, externalId, description].filter(Boolean))
  return {
    label,
    slug,
    externalId,
    description,
    dataColumns: headers.filter((header) => !specialColumns.has(header)),
  }
}

export const csvFileNameToTypeSlug = (fileName: string): string => {
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  const slug = baseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'csv-import'
}

export const csvFileNameToTypeLabel = (fileName: string): string =>
  csvFileNameToTypeSlug(fileName)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const valueAsText = (value: string | number | undefined): string =>
  value === undefined ? '' : String(value).trim()

const fallbackSlug = (value: string, index: number): string => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `row-${index + 1}`
}

const rowValue = (row: Record<string, string | number>, key: string | undefined): string =>
  valueAsText(key ? row[key] : undefined)

const mappedFieldValue = (data: Record<string, unknown>, path: string | undefined): string | undefined => {
  if (!path) return undefined
  const value = get(data, path)
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim()
  return text || undefined
}

const setMappedValue = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const segments = path.split('.')
  const segment = segments.shift()
  if (!segment) return
  const isArray = segment.endsWith('[]')
  const key = isArray ? segment.slice(0, -2) : segment
  if (segments.length === 0) {
    target[key] = isArray ? [value] : value
    return
  }
  if (isArray) {
    const previousItems = target[key]
    const item =
      Array.isArray(previousItems) &&
        previousItems[0] !== null &&
        typeof previousItems[0] === 'object' &&
        !Array.isArray(previousItems[0])
        ? (previousItems[0] as Record<string, unknown>)
        : {}
    target[key] = [item]
    setMappedValue(item, segments.join('.'), value)
    return
  }
  const nested = (target[key] ?? {}) as Record<string, unknown>
  target[key] = nested
  setMappedValue(nested, segments.join('.'), value)
}

const mapCSVRowToData = (
  row: Record<string, string | number>,
  mapping: CSVImportMapping,
  relationshipFields: string[]
): Record<string, unknown> => {
  const dataColumns = mapping.dataColumns
  const mappedRoleColumns = [mapping.label, mapping.slug, mapping.externalId, mapping.description]
    .filter((column): column is string =>
      Boolean(column && dataColumns?.includes(column) && mapping.fieldMappings?.[column])
    )
  const columns = new Set([...(dataColumns ?? []), ...relationshipFields, ...mappedRoleColumns])
  return Object.keys(mapping.fieldMappings ?? {}).length > 0
    ? [...columns].reduce<Record<string, unknown>>((mappedData, sourceColumn) => {
      setMappedValue(
        mappedData,
        mapping.fieldMappings?.[sourceColumn] ?? sourceColumn,
        row[sourceColumn] ?? ''
      )
      return mappedData
    }, {})
    : columns.size > 0
      ? Object.fromEntries(
        [...columns].map((key) => [key, row[key] ?? ''])
      )
      : row
}

const createCandidate = (
  row: Record<string, string | number>,
  index: number,
  sourceId: string,
  mapping: CSVImportMapping,
  relationshipFields: string[],
  fieldMappings?: IObjectTypeFieldMappings
): ImportCandidate => {
  const data = mapCSVRowToData(row, mapping, relationshipFields)
  const mappedSlug = mappedFieldValue(data, fieldMappings?.slug)
  const label =
    mappedFieldValue(data, fieldMappings?.label) ||
    rowValue(row, mapping.label) ||
    rowValue(row, mapping.externalId) ||
    `Row ${index + 1}`
  const slug = mappedSlug || rowValue(row, mapping.slug) || fallbackSlug(label, index)
  const externalId =
    mappedSlug || rowValue(row, mapping.externalId) || (fieldMappings ? slug : String(index + 1))
  const description =
    mappedFieldValue(data, fieldMappings?.description) || rowValue(row, mapping.description)
  return {
    uuid: externalId,
    label,
    slug,
    description,
    data: row,
    provenance: { sourceId, externalId },
  }
}

const createRecord = (
  candidate: ImportCandidate,
  mapping: CSVImportMapping,
  relationshipFields: string[],
  fixedFields: Record<string, unknown>,
  fieldMappings?: IObjectTypeFieldMappings
): CanonicalImportRecord => {
  const row = candidate.data as Record<string, string | number>
  const recordData = mapCSVRowToData(row, mapping, relationshipFields)
  Object.entries(fixedFields).forEach(([path, value]) => setMappedValue(recordData, path, value))
  const description =
    mappedFieldValue(recordData, fieldMappings?.description) ||
    rowValue(row, mapping.description) ||
    candidate.description ||
    ''
  return {
    uuid: candidate.uuid,
    label: mappedFieldValue(recordData, fieldMappings?.label) || candidate.label,
    slug: mappedFieldValue(recordData, fieldMappings?.slug) || candidate.slug,
    description,
    data: recordData,
    attrs: {},
    sourceData: candidate.data,
    provenance: candidate.provenance,
  }
}

export const createCSVImportAdapter = ({
  id,
  text,
  mapping = {},
  relationshipRules,
  relationshipFields = [],
  arrayTarget,
  fixedFields = {},
  fieldMappings,
  sourceKey,
  schema,
}: CSVImportAdapterOptions): ImportSourceAdapter => {
  let parsed: ParsedCSV | undefined
  const getParsed = () => {
    parsed ??= parseCSV(text)
    return parsed
  }

  return {
    id,
    defaultImportUrl: `csv://${id}`,
    relationshipRules,
    arrayTarget,
    sourceKey,
    schema,
    discover: async () =>
      getParsed().data.map((row, index) =>
        createCandidate(row, index, id, mapping, relationshipFields, fieldMappings)
      ),
    load: async ({ candidate }) =>
      createRecord(candidate, mapping, relationshipFields, fixedFields, fieldMappings),
  }
}

export const createCSVImportAdapterFromFile = async ({
  id,
  label,
  file,
  mapping,
}: Omit<CSVImportAdapterOptions, 'text'> & { file: File }): Promise<ImportSourceAdapter> =>
  createCSVImportAdapter({ id, label, mapping, text: await file.text() })
