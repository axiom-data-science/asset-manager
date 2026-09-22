import Ajv from ***REMOVED***ajv***REMOVED***
import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import oikosLayerSchema from ***REMOVED***./oikos_layer.schema.json***REMOVED***
import oikosLayerGroupSchema from ***REMOVED***./oikos_layer_group.schema.json***REMOVED***
import oikosModuleSchema from ***REMOVED***./oikos_module.schema.json***REMOVED***

const ajv = new Ajv({ allErrors: true, strict: false })

const validate = (schema: unknown, value: unknown) => {
  const { $schema, ...schemaWithoutMeta } = schema as JSONSchema6
  void $schema
  const validator = ajv.compile(schemaWithoutMeta as Record<string, unknown>)
  return validator(value as never) ? undefined : (validator.errors ?? [])
}

const validLayer = {
  id: 101,
  label: ***REMOVED***Temperature layer***REMOVED***,
  uuid: ***REMOVED***layer-101***REMOVED***,
  ogc_name: ***REMOVED***temperature***REMOVED***,
  wms_url: ***REMOVED***https://example.test/wms***REMOVED***,
  raw_wms_url: ***REMOVED***https://example.test/raw-wms***REMOVED***,
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
  label: ***REMOVED***Ocean layers***REMOVED***,
  uuid: ***REMOVED***layer-group-22***REMOVED***,
  module_id: 7,
  module_uuid: ***REMOVED***module-7***REMOVED***,
  module_label: ***REMOVED***Ocean module***REMOVED***,
  project: false,
  num_siblings: 1,
  has_metadata: true,
  keywords: [***REMOVED***ocean***REMOVED***],
  portal_ids: [3],
  data_provider_descriptions: [***REMOVED***Example provider***REMOVED***],
  tags: { domain: [***REMOVED***ocean***REMOVED***] },
  access_methods: [***REMOVED***public***REMOVED***],
}

const validModule = {
  id: 7,
  label: ***REMOVED***Ocean module***REMOVED***,
  uuid: ***REMOVED***module-7***REMOVED***,
  enabled: true,
  searchable: true,
  generated: false,
  include_in_rice_report: false,
  min_lng: -180,
  min_lat: -90,
  max_lng: 180,
  max_lat: 90,
  creation_time: 1700000000,
  keywords: [***REMOVED***ocean***REMOVED***],
  portal_ids: [3],
  data_provider_descriptions: [***REMOVED***Example provider***REMOVED***],
  has_metadata: true,
  tags: { domain: [***REMOVED***ocean***REMOVED***] },
  access_methods: [***REMOVED***public***REMOVED***],
  layer_group_count: 1,
  layer_group_info: { primary: ***REMOVED***Ocean layers***REMOVED*** },
}

describe(***REMOVED***Oikos import schemas***REMOVED***, () => {
  it(***REMOVED***accepts a representative layer payload***REMOVED***, () => {
    expect(validate(oikosLayerSchema, validLayer)).toBeUndefined()
  })

  it(***REMOVED***rejects invalid layer primitive types***REMOVED***, () => {
    const invalidLayer = { ...validLayer, uuid: 101 }

    expect(validate(oikosLayerSchema, invalidLayer)).toEqual(
      expect.arrayContaining([expect.objectContaining({ instancePath: ***REMOVED***/uuid***REMOVED***, keyword: ***REMOVED***type***REMOVED*** })])
    )
  })

  it(***REMOVED***accepts a representative layer group payload***REMOVED***, () => {
    expect(validate(oikosLayerGroupSchema, validLayerGroup)).toBeUndefined()
  })

  it(***REMOVED***rejects invalid layer group primitive types***REMOVED***, () => {
    const invalidLayerGroup = { ...validLayerGroup, module_uuid: 7 }

    expect(validate(oikosLayerGroupSchema, invalidLayerGroup)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: ***REMOVED***/module_uuid***REMOVED***, keyword: ***REMOVED***type***REMOVED*** }),
      ])
    )
  })

  it(***REMOVED***accepts a representative module payload***REMOVED***, () => {
    expect(validate(oikosModuleSchema, validModule)).toBeUndefined()
  })

  it(***REMOVED***rejects invalid module nested collection values***REMOVED***, () => {
    const invalidModule = { ...validModule, tags: { domain: [7] } }

    expect(validate(oikosModuleSchema, invalidModule)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instancePath: ***REMOVED***/tags/domain/0***REMOVED***, keyword: ***REMOVED***type***REMOVED*** }),
      ])
    )
  })
})
