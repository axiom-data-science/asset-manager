import { describe, expect, it } from 'vitest'
import {
  createCSVImportAdapter,
  inferCSVImportMapping,
  isCSVImportMappingComplete,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
} from './csv_adapter'

describe('createCSVImportAdapter', () => {
  it('infers special fields and leaves remaining columns as document data', () => {
    expect(inferCSVImportMapping(['external_id', 'name', 'description', 'category'])).toEqual({
      label: 'name',
      slug: undefined,
      externalId: 'external_id',
      description: 'description',
      dataColumns: ['category'],
    })
  })

  it('derives readable type and schema names from a filename', () => {
    expect(csvFileNameToTypeSlug('Test Metadata 2026.csv')).toBe('test_metadata_2026')
    expect(csvFileNameToTypeLabel('Test Metadata 2026.csv')).toBe('Test Metadata 2026')
    expect(csvFileNameToTypeSlug('.csv')).toBe('csv-import')
  })

  it('reports whether every CSV header is mapped', () => {
    const headers = ['id', 'name', 'category']
    const mapping = inferCSVImportMapping(headers)

    expect(isCSVImportMappingComplete(headers, mapping)).toBe(true)
    expect(isCSVImportMappingComplete(headers, { ...mapping, dataColumns: [] })).toBe(false)
  })

  it('discovers rows with stable provenance and loads canonical records', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-assets',
      text: 'id,name,kind\nasset-1,Asset One,photo\nasset-2,Asset Two,video',
      mapping: { externalId: 'id', label: 'name', slug: 'id', dataColumns: ['kind'] },
    })

    const candidates = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate: candidates[0] })

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      uuid: 'asset-1',
      label: 'Asset One',
      slug: 'asset-1',
      data: { id: 'asset-1', name: 'Asset One', kind: 'photo' },
      provenance: { sourceId: 'csv-assets', externalId: 'asset-1' },
    })
    expect(record).toMatchObject({
      uuid: 'asset-1',
      label: 'Asset One',
      slug: 'asset-1',
      data: { kind: 'photo' },
      sourceData: candidates[0].data,
      provenance: candidates[0].provenance,
    })
  })

  it('forwards relationship rules and preserves configured join fields', async () => {
    const relationshipRules = [{
      parentObjectTypeSlug: 'departments',
      childObjectTypeSlug: 'assets',
      parentMatchField: 'code',
      childMatchField: 'department_code',
      predicate: 'belongs_to',
    }]
    const adapter = createCSVImportAdapter({
      id: 'assets-source-1',
      text: `id,label,department_code
    asset-1,Asset One,D-1`,
      mapping: { externalId: 'id', label: 'label' },
      relationshipRules,
      relationshipFields: ['department_code'],
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(adapter.relationshipRules).toEqual(relationshipRules)
    expect(record.data).toEqual({ department_code: 'D-1' })
  })

  it('falls back to row identity and a readable label and slug', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-items',
      text: 'title,value\nA useful item,3\n,4',
    })
    const candidates = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })

    expect(candidates.map(({ uuid, label, slug }) => ({ uuid, label, slug }))).toEqual([
      { uuid: '1', label: 'Row 1', slug: 'row-1' },
      { uuid: '2', label: 'Row 2', slug: 'row-2' },
    ])
  })
})
