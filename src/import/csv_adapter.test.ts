import { describe, expect, it } from 'vitest'
import {
  createCSVImportAdapter,
  inferCSVImportMapping,
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
