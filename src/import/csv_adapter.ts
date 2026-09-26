import { parseCSV, type ParsedCSV } from '@/lib/csv'
import type {
  CanonicalImportRecord,
  ImportArraySourceTarget,
  ImportCandidate,
  ImportSourceAdapter,
} from './types'
import type { JSONSchema6 } from 'json-schema'

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

export const getCSVSchemaFields = (
  schema: JSONSchema6 | undefined,
  parentPath = ''
): CSVSchemaField[] => {
  if (!schema?.properties || typeof schema.properties !== 'object') return []
  const requiredFields = new Set(schema.required ?? [])

  return Object.entries(schema.properties)
    .flatMap(([id, property]) => {
      if (!property || typeof property === 'boolean') return []
      const path = parentPath ? `${parentPath}.${id}` : id
      const title = typeof property.title === 'string' ? property.title : id
      const nestedFields = getCSVSchemaFields(property, path)
      const arrayItem = Array.isArray(property.items) ? property.items[0] : property.items
      const arrayFields =
        arrayItem && typeof arrayItem !== 'boolean'
          ? getCSVSchemaFields(arrayItem, `${path}[]`)
          : []
      return [{ id, path, title, required: requiredFields.has(id) }, ...nestedFields, ...arrayFields]
    })
    .sort((left, right) => Number(right.required) - Number(left.required))
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
  schema: JSONSchema6 | undefined
): Record<string, string> => {
  const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const schemaFields = getCSVSchemaFields(schema)
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
    const item: Record<string, unknown> = {}
    target[key] = [item]
    setMappedValue(item, segments.join('.'), value)
    return
  }
  const nested = (target[key] ?? {}) as Record<string, unknown>
  target[key] = nested
  setMappedValue(nested, segments.join('.'), value)
}

const createCandidate = (
  row: Record<string, string | number>,
  index: number,
  sourceId: string,
  mapping: CSVImportMapping
): ImportCandidate => {
  const externalId = rowValue(row, mapping.externalId) || String(index + 1)
  const label =
    rowValue(row, mapping.label) || rowValue(row, mapping.externalId) || `Row ${index + 1}`
  const slug = rowValue(row, mapping.slug) || fallbackSlug(label, index)
  return {
    uuid: externalId,
    label,
    slug,
    data: row,
    provenance: { sourceId, externalId },
  }
}

const createRecord = (
  candidate: ImportCandidate,
  mapping: CSVImportMapping,
  relationshipFields: string[]
): CanonicalImportRecord => {
  const description = rowValue(
    candidate.data as Record<string, string | number>,
    mapping.description
  )
  const dataColumns = mapping.dataColumns
  const mappedRoleColumns = [mapping.label, mapping.slug, mapping.externalId, mapping.description]
    .filter((column): column is string =>
      Boolean(column && dataColumns?.includes(column) && mapping.fieldMappings?.[column])
    )
  const columns = new Set([...(dataColumns ?? []), ...relationshipFields, ...mappedRoleColumns])
  const data =
    Object.keys(mapping.fieldMappings ?? {}).length > 0
      ? [...columns].reduce<Record<string, unknown>>((mappedData, sourceColumn) => {
        setMappedValue(
          mappedData,
          mapping.fieldMappings?.[sourceColumn] ?? sourceColumn,
          (candidate.data as Record<string, string | number>)[sourceColumn] ?? ''
        )
        return mappedData
      }, {})
      : columns.size > 0
        ? Object.fromEntries(
          [...columns].map((key) => [
            key,
            (candidate.data as Record<string, string | number>)[key] ?? '',
          ])
        )
        : candidate.data
  return {
    uuid: candidate.uuid,
    label: candidate.label,
    slug: candidate.slug,
    description,
    data,
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
      getParsed().data.map((row, index) => createCandidate(row, index, id, mapping)),
    load: async ({ candidate }) => createRecord(candidate, mapping, relationshipFields),
  }
}

export const createCSVImportAdapterFromFile = async ({
  id,
  label,
  file,
  mapping,
}: Omit<CSVImportAdapterOptions, 'text'> & { file: File }): Promise<ImportSourceAdapter> =>
  createCSVImportAdapter({ id, label, mapping, text: await file.text() })
