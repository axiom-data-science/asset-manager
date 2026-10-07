import { describe, expect, it } from 'vitest'
import type { JSONSchema6 } from 'json-schema'
import {
  createCSVImportAdapter,
  inferCSVImportMapping,
  isCSVImportMappingComplete,
  isCSVSchemaMappingComplete,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  getAvailableCSVSchemaFieldPaths,
  getCSVArrayItemSchema,
  getCSVOptionalObjectArrayFields,
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

  it('allows automatic preparation only when data columns have confident schema paths', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    } satisfies JSONSchema6
    const headers = ['name', 'parent_code']
    const mapping = {
      label: undefined,
      slug: undefined,
      externalId: undefined,
      description: undefined,
      dataColumns: headers,
      fieldMappings: { name: 'name' },
    }

    expect(isCSVSchemaMappingComplete(headers, mapping, schema, ['parent_code'])).toBe(true)
    expect(
      isCSVSchemaMappingComplete(
        ['name', 'unknown_column'],
        { ...mapping, dataColumns: ['name', 'unknown_column'] },
        schema
      )
    ).toBe(false)
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

  it('discovers nested object-array fields for optional source slots', () => {
    expect(
      getCSVOptionalObjectArrayFields({
        type: 'object',
        required: ['requiredItems'],
        properties: {
          metadata: {
            type: 'object',
            properties: {
              samples: {
                type: 'array',
                title: 'Samples',
                items: { type: 'object', properties: { code: { type: 'string' } } },
              },
            },
          },
          tags: { type: 'array', items: { type: 'string' } },
          requiredItems: {
            type: 'array',
            items: { type: 'object', properties: { code: { type: 'string' } } },
          },
        },
      })
    ).toEqual([{ path: 'metadata.samples', title: 'Samples' }])
  })

  it('exposes scalar array item paths for CSV column mapping', () => {
    const fields = getCSVSchemaFields({
      type: 'object',
      properties: {
        navigationFileURIList: {
          type: 'array',
          items: { type: 'string', format: 'uri' },
        },
      },
    })

    expect(fields).toEqual([
      { id: 'navigationFileURIList', path: 'navigationFileURIList[]', title: 'navigationFileURIList', required: false },
    ])
    expect(inferCSVSchemaFieldMappings(['navigationFileURIList[]'], {
      type: 'object',
      properties: {
        navigationFileURIList: {
          type: 'array',
          items: { type: 'string', format: 'uri' },
        },
      },
    })).toEqual({ 'navigationFileURIList[]': 'navigationFileURIList[]' })
  })

  it('discovers fields from the selected oneOf branch and resolves its refs', () => {
    const fields = getCSVSchemaFields(
      {
        type: 'object',
        definitions: {
          marineLocation: {
            type: 'object',
            properties: {
              latitude: { type: 'number', title: 'Latitude' },
            },
          },
        },
        properties: {
          locationDetail: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  type: { type: 'string', const: 'stationary_marine' },
                  deploymentLocation: { $ref: '#/definitions/marineLocation' },
                },
              },
              {
                type: 'object',
                properties: {
                  type: { type: 'string', const: 'stationary_terrestrial' },
                  surfaceElevation: { type: 'number', title: 'Surface Elevation' },
                },
              },
            ],
          },
        },
      },
      '',
      { locationDetail: 'stationary_marine' }
    )

    expect(fields.map(({ path }) => path)).toContain('locationDetail.deploymentLocation.latitude')
    expect(fields.map(({ path }) => path)).not.toContain('locationDetail.surfaceElevation')
  })

  it.each([
    ['stationary_marine', 'seaArea'],
    ['stationary_terrestrial', 'surfaceElevation'],
    ['mobile_marine', 'navigationFileURIList'],
    ['multipoint_stationary_marine', 'locations'],
  ])('exposes only the %s location branch', (choice, expectedField) => {
    const schema = {
      type: 'object' as const,
      properties: {
        locationDetail: {
          oneOf: [
            { type: 'object' as const, properties: { type: { const: 'stationary_marine' }, seaArea: { type: 'string' as const } } },
            { type: 'object' as const, properties: { type: { const: 'stationary_terrestrial' }, surfaceElevation: { type: 'number' as const } } },
            { type: 'object' as const, properties: { type: { const: 'mobile_marine' }, navigationFileURIList: { type: 'array' as const } } },
            { type: 'object' as const, properties: { type: { const: 'multipoint_stationary_marine' }, locations: { type: 'array' as const } } },
          ],
        },
      },
    } as JSONSchema6
    const paths = getCSVSchemaFields(schema, '', { locationDetail: choice }).map(({ path }) => path)

    expect(paths).toContain(`locationDetail.${expectedField}`)
    expect(paths.filter((path) => path.startsWith('locationDetail.') && path !== 'locationDetail.type'))
      .toEqual([`locationDetail.${expectedField}`])
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

  it('derives document metadata from object-type field mappings after CSV mapping', async () => {
    const adapter = createCSVImportAdapter({
      id: 'pam-project-source',
      text: 'project_name,data_submitter\nNorth Pacific Survey,Marine Institute',
      mapping: {
        dataColumns: ['project_name', 'data_submitter'],
        fieldMappings: {
          project_name: 'project',
          data_submitter: 'dataSubmitter',
        },
      },
      fieldMappings: {
        label: 'project',
        description: 'dataSubmitter',
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(candidate).toMatchObject({
      uuid: 'north-pacific-survey',
      label: 'North Pacific Survey',
      slug: 'north-pacific-survey',
      description: 'Marine Institute',
      provenance: { sourceId: 'pam-project-source', externalId: 'north-pacific-survey' },
    })
    expect(record).toMatchObject({
      label: 'North Pacific Survey',
      slug: 'north-pacific-survey',
      description: 'Marine Institute',
      data: { project: 'North Pacific Survey', dataSubmitter: 'Marine Institute' },
    })
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

  it('combines multiple mapped columns into the same nested array item', async () => {
    const adapter = createCSVImportAdapter({
      id: 'pam-site-source',
      text: 'latitude,longitude\n44.1,-123.2',
      mapping: {
        dataColumns: ['latitude', 'longitude'],
        fieldMappings: {
          latitude: 'locationDetail.locations[].latitude',
          longitude: 'locationDetail.locations[].longitude',
        },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.data).toEqual({
      locationDetail: { locations: [{ latitude: 44.1, longitude: -123.2 }] },
    })
  })

  it('writes configured fixed fields into structured document data', async () => {
    const adapter = createCSVImportAdapter({
      id: 'pam-site-source',
      text: 'site_name,latitude\nHarbor,44.1',
      mapping: {
        dataColumns: ['site_name', 'latitude'],
        fieldMappings: {
          site_name: 'siteOrCruiseName',
          latitude: 'locationDetail.deploymentLocation.latitude',
        },
      },
      fixedFields: { 'locationDetail.type': 'stationary_marine' },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.data).toEqual({
      siteOrCruiseName: 'Harbor',
      locationDetail: {
        deploymentLocation: { latitude: 44.1 },
        type: 'stationary_marine',
      },
    })
  })

  it('maps a scalar array CSV column into one array item', async () => {
    const adapter = createCSVImportAdapter({
      id: 'pam-site-source',
      text: 'navigation_uri\nhttps://example.org/navigation.csv',
      mapping: {
        dataColumns: ['navigation_uri'],
        fieldMappings: { navigation_uri: 'locationDetail.navigationFileURIList[]' },
      },
    })

    const [candidate] = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate })

    expect(record.data).toEqual({
      locationDetail: { navigationFileURIList: ['https://example.org/navigation.csv'] },
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
