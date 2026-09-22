import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import type { JSONSchema6 } from 'json-schema'
import oikosLayerSchema from './oikos_layer.schema.json'
import oikosLayerGroupSchema from './oikos_layer_group.schema.json'
import oikosModuleSchema from './oikos_module.schema.json'

const ajv = new Ajv({ allErrors: true, strict: false })

const validate = (schema: unknown, value: unknown) => {
  const { $schema, ...schemaWithoutMeta } = schema as JSONSchema6
  void $schema
  const validator = ajv.compile(schemaWithoutMeta as Record<string, unknown>)
  return validator(value as never) ? undefined : (validator.errors ?? [])
}

const validLayer = {
  id: 101,
  label: 'Temperature layer',
  uuid: 'layer-101',
  ogc_name: 'temperature',
  wms_url: 'https://example.test/wms',
  raw_wms_url: 'https://example.test/raw-wms',
  alpha: 1,
  cache_expiration_seconds: 3600,
  native_epsg: 4326,
  supports_get_legend_graphic: true,
  elevations: [],
  layer_group_id: 22,
  description: null,
  min_lng: -180,
  max_lng: 180,
}

const validLayerGroup = {
  id: 22,
  label: 'Ocean layers',
  uuid: 'layer-group-22',
  module_id: 7,
  module_uuid: 'module-7',
  module_label: 'Ocean module',
  project: false,
  num_siblings: 1,
  has_metadata: true,
  keywords: ['ocean'],
  portal_ids: [3],
  data_provider_descriptions: ['Example provider'],
  tags: { domain: ['ocean'] },
  access_methods: ['public'],
}

const validModule = {
  id: 7,
  label: 'Ocean module',
  uuid: 'module-7',
  enabled: true,
  searchable: true,
  generated: false,
  include_in_rice_report: false,
  min_lng: -180,
  min_lat: -90,
  max_lng: 180,
  max_lat: 90,
  creation_time: 1700000000,
  keywords: ['ocean'],
  portal_ids: [3],
  data_provider_descriptions: ['Example provider'],
  has_metadata: true,
  tags: { domain: ['ocean'] },
  access_methods: ['public'],
  layer_group_count: 1,
  layer_group_info: { primary: 'Ocean layers' },
}

describe('Oikos import schemas', () => {
  it('accepts a representative layer payload', () => {
    expect(validate(oikosLayerSchema, validLayer)).toBeUndefined()
  })

  it('rejects invalid layer primitive types', () => {
    const invalidLayer = { ...validLayer, uuid: 101 }

    expect(validate(oikosLayerSchema, invalidLayer)).toEqual(
      expect.arrayContaining([expect.objectContaining({ instancePath: '/uuid', keyword: 'type' })])
    )
  })

  it('accepts a representative layer group payload', () => {
    expect(validate(oikosLayerGroupSchema, validLayerGroup)).toBeUndefined()
  })

  it('rejects invalid layer group primitive types', () => {
    const invalidLayerGroup = { ...validLayerGroup, module_uuid: 7 }

    expect(validate(oikosLayerGroupSchema, invalidLayerGroup)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: '/module_uuid', keyword: 'type' }),
      ])
    )
  })

  it('accepts a representative module payload', () => {
    expect(validate(oikosModuleSchema, validModule)).toBeUndefined()
  })

  it('rejects invalid module nested collection values', () => {
    const invalidModule = { ...validModule, tags: { domain: [7] } }

    expect(validate(oikosModuleSchema, invalidModule)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: '/tags/domain/0', keyword: 'type' }),
      ])
    )
  })
})
