import { describe, expect, it } from 'vitest'
import {
  createCSVImportAdapter,
  inferCSVImportMapping,
  isCSVImportMappingComplete,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  getAvailableCSVSchemaFieldPaths,
  getCSVArrayItemSchema,
  getCSVSchemaFields,
  inferCSVSchemaFieldMappings,
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

  it('catalogs titled nested and array schema fields with their paths', () => {
    const fields = getCSVSchemaFields({
      type: 'object',
      required: ['tags'],
      properties: {
        metadata: {
          type: 'object',
          required: ['owner'],
          properties: {
            owner: { type: 'string', title: 'Owner name' },
          },
        },
        tags: {
          items: { type: 'object', properties: { value: { type: 'string' } } },
        },
      },
    })

    expect(fields).toEqual([
      { id: 'owner', path: 'metadata.owner', title: 'Owner name', required: true },
      { id: 'tags', path: 'tags', title: 'tags', required: true },
      { id: 'metadata', path: 'metadata', title: 'metadata', required: false },
      { id: 'value', path: 'tags[].value', title: 'value', required: false },
    ])
  })

  it('resolves the item schema for an array field', () => {
    const itemSchema = getCSVArrayItemSchema(
      {
        type: 'object',
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: { email: { type: 'string' } },
            },
          },
        },
      },
      'contacts'
    )

    expect(itemSchema?.properties).toEqual({ email: { type: 'string' } })
  })

  it('infers nested paths and excludes already-mapped schema fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        owner: { type: 'string' as const, title: 'Owner' },
        metadata: {
          type: 'object' as const,
          properties: { code: { type: 'string' as const } },
        },
      },
    }

    expect(inferCSVSchemaFieldMappings(['owner', 'metadata.code'], schema)).toEqual({
      owner: 'owner',
      'metadata.code': 'metadata.code',
    })
    expect(
      Array.from(
        getAvailableCSVSchemaFieldPaths(
          { fieldMappings: { owner: 'owner', 'metadata.code': 'metadata.code' } },
          'owner'
        )
      )
    ).toEqual(['metadata.code'])
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
    const relationshipRules = [
      {
        parentObjectTypeSlug: 'departments',
        childObjectTypeSlug: 'assets',
        parentMatchField: 'code',
        childMatchField: 'department_code',
        predicate: 'belongs_to',
      },
    ]
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

  it('maps CSV columns to selected schema fields', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-assets',
      text: 'asset_id,asset_name,asset_kind,source_note\nasset-1,Asset One,photo,internal',
      mapping: {
        externalId: 'asset_id',
        label: 'asset_name',
        dataColumns: ['asset_kind', 'source_note'],
        fieldMappings: { asset_kind: 'kind' },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.data).toEqual({ kind: 'photo', source_note: 'internal' })
  })

  it('writes nested and array-item schema mappings as structured data', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-assets',
      text: 'owner_name,tag_value\nAda,important',
      mapping: {
        dataColumns: ['owner_name', 'tag_value'],
        fieldMappings: {
          owner_name: 'metadata.owner',
          tag_value: 'tags[].value',
        },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.data).toEqual({
      metadata: { owner: 'Ada' },
      tags: [{ value: 'important' }],
    })
  })

  it('preserves a document role while also mapping that column to schema data', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-assets',
      text: 'name\nAsset One',
      mapping: {
        label: 'name',
        dataColumns: ['name'],
        fieldMappings: { name: 'metadata.display_name' },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.label).toBe('Asset One')
    expect(record.data).toEqual({ metadata: { display_name: 'Asset One' } })
  })

  it('keeps a document role without copying the column into document data', async () => {
    const adapter = createCSVImportAdapter({
      id: 'csv-assets',
      text: 'name\nAsset One',
      mapping: {
        label: 'name',
        fieldMappings: { name: 'metadata.display_name' },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.label).toBe('Asset One')
    expect(record.data).toEqual({})
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
