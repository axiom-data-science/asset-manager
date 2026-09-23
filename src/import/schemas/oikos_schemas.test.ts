// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import oikosLayerSchema from './oikos_layer.schema.json'
import oikosLayerGroupSchema from './oikos_layer_group.schema.json'
import oikosModuleSchema from './oikos_module.schema.json'
import { schemaToFormUtils } from '@axdspub/axiom-ui-forms'
import type { JSONSchema6 } from 'json-schema'

const withoutDraftMetadata = (schema: JSONSchema6): JSONSchema6 => {
  const schemaWithoutMetadata = { ...schema }
  delete schemaWithoutMetadata.$schema
  return schemaWithoutMetadata
}

const layerSchema = withoutDraftMetadata(oikosLayerSchema as JSONSchema6)
const layerGroupSchema = withoutDraftMetadata(oikosLayerGroupSchema as JSONSchema6)
const moduleSchema = withoutDraftMetadata(oikosModuleSchema as JSONSchema6)

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
    expect(schemaToFormUtils.validateAgainstSchema(layerSchema, validLayer).length).toBe(0)
  })

  it('rejects invalid layer primitive types', () => {
    const invalidLayer = { ...validLayer, uuid: 101 }

    expect(schemaToFormUtils.validateAgainstSchema(layerSchema, invalidLayer)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'uuid', message: expect.stringContaining('/uuid') }),
      ])
    )
  })

  it('accepts a representative layer group payload', () => {
    expect(schemaToFormUtils.validateAgainstSchema(layerGroupSchema, validLayerGroup).length).toBe(0)
  })

  it('rejects invalid layer group primitive types', () => {
    const invalidLayerGroup = { ...validLayerGroup, module_uuid: 7 }

    expect(schemaToFormUtils.validateAgainstSchema(layerGroupSchema, invalidLayerGroup)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'module_uuid',
          message: expect.stringContaining('/module_uuid'),
        }),
      ])
    )
  })

  it('accepts a representative module payload', () => {
    expect(schemaToFormUtils.validateAgainstSchema(moduleSchema, validModule).length).toBe(0)
  })

  it('rejects invalid module nested collection values', () => {
    const invalidModule = { ...validModule, tags: { domain: [7] } }

    expect(schemaToFormUtils.validateAgainstSchema(moduleSchema, invalidModule)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'tags.domain.0',
          message: expect.stringContaining('/tags/domain/0'),
        }),
      ])
    )
  })
})
