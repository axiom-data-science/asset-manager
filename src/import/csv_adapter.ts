import { parseCSV, type ParsedCSV } from '@/lib/csv'
import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from './types'

export type CSVImportMapping = {
  label?: string
  slug?: string
  externalId?: string
  description?: string
  dataColumns?: string[]
}

export type CSVImportAdapterOptions = {
  id: string
  label?: string
  text: string
  mapping?: CSVImportMapping
  relationshipRules?: ImportSourceAdapter['relationshipRules']
  relationshipFields?: string[]
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
  const columns = new Set([...(dataColumns ?? []), ...relationshipFields])
  const data = columns.size > 0
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
