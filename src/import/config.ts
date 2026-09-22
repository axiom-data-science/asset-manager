import { ChartBarBig, Grid2X2, Grid2X2Plus, Layers2, Layers3, LayersPlus, Ship, Thermometer } from ***REMOVED***lucide-react***REMOVED***
import type { IImportPageProps } from ***REMOVED***./pages/import_records_page_impl***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import oikosLayerSchema from ***REMOVED***./schemas/oikos_layer.schema.json***REMOVED***
import oikosLayerGroupSchema from ***REMOVED***./schemas/oikos_layer_group.schema.json***REMOVED***
import oikosModuleSchema from ***REMOVED***./schemas/oikos_module.schema.json***REMOVED***
import { createRemoteImportAdapter } from ***REMOVED***./adapters***REMOVED***
import {
  binninatorMetadata,
  binninatorRecords,
  binninatorRoot,
  defaultBinninatorRecordsURL,
  defaultOikosModelsURL,
  movingPlatform,
  OIKOS_URL_ROOT,
  oikosLayer,
  oikosLayerGroup,
  oikosModel,
  oikosModels,
  oikosModelVariable,
  oikosModelVariables,
  oikosModule,
  oikosVectorLayerGroups,
  oikosVectorLayers,
  oikosVectorModules,
  PLATFORM_ROOT,
  searchDocs,
  searchURL,
  SENSORS_ROOT,
  sensorStation,
} from ***REMOVED***./services***REMOVED***

const importConfigs: IImportPageProps[] = [
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***moving_platform***REMOVED***,
      defaultImportUrl: searchURL({
        type: ***REMOVED***platform2***REMOVED***,
        count: 100,
        portal_id: 25,
      }),
      discover: searchDocs,
      defaultDetailRoot: PLATFORM_ROOT,
      load: movingPlatform,
    }),
    label: ***REMOVED***Moving Platform***REMOVED***,
    type: ***REMOVED***moving_platform***REMOVED***,
    icon: Ship
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***sensor_station***REMOVED***,
      defaultImportUrl: searchURL({
        type: ***REMOVED***sensor_station***REMOVED***,
        count: 100,
        portal_id: 25,
      }),
      defaultDetailRoot: SENSORS_ROOT,
      discover: searchDocs,
      load: sensorStation,
    }),
    label: ***REMOVED***Sensor Station***REMOVED***,
    type: ***REMOVED***sensor_station***REMOVED***,
    icon: Thermometer
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***oikos_model***REMOVED***,
      defaultImportUrl: defaultOikosModelsURL,
      discover: oikosModels,
      defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
      load: oikosModel,
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***oikos_model***REMOVED***,
          childObjectTypeSlug: ***REMOVED***oikos_model_variable***REMOVED***,
          parentMatchField: ***REMOVED***slug***REMOVED***,
          childMatchField: ***REMOVED***modelSlug***REMOVED***,
          predicate: ***REMOVED***has_parent***REMOVED***,
        }
      ]
    }),
    label: ***REMOVED***Oikos Model***REMOVED***,
    type: ***REMOVED***oikos_model***REMOVED***,
    icon: Grid2X2
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***oikos_model_variable***REMOVED***,
      defaultImportUrl: defaultOikosModelsURL,
      discover: oikosModelVariables,
      defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
      load: oikosModelVariable,
    }),
    label: ***REMOVED***Oikos Model Variable***REMOVED***,
    type: ***REMOVED***oikos_model_variable***REMOVED***,
    icon: Grid2X2Plus,

  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***binner_record***REMOVED***,
      defaultImportUrl: defaultBinninatorRecordsURL,
      discover: binninatorRecords,
      defaultDetailRoot: binninatorRoot,
      load: binninatorMetadata,
    }),
    label: ***REMOVED***Binner Record***REMOVED***,
    type: ***REMOVED***binner_record***REMOVED***,
    icon: ChartBarBig
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***oikos_vector_layer***REMOVED***,
      defaultImportUrl: searchURL({
        type: ***REMOVED***layer_group***REMOVED***,
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorLayers,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosLayer,
      schema: oikosLayerSchema as JSONSchema6
    }),
    label: ***REMOVED***Oikos Vector Layer***REMOVED***,
    type: ***REMOVED***oikos_vector_layer***REMOVED***,
    icon: Layers2
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***oikos_vector_layer_group***REMOVED***,
      defaultImportUrl: searchURL({
        type: ***REMOVED***layer_group***REMOVED***,
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorLayerGroups,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosLayerGroup,
      schema: oikosLayerGroupSchema as JSONSchema6,
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***oikos_vector_layer_group***REMOVED***,
          childObjectTypeSlug: ***REMOVED***oikos_vector_layer***REMOVED***,
          parentMatchField: ***REMOVED***id***REMOVED***,
          childMatchField: ***REMOVED***layer_group_id***REMOVED***,
          predicate: ***REMOVED***has_parent***REMOVED***,
        }
      ]
    }),
    label: ***REMOVED***Oikos Vector Layer Group***REMOVED***,
    type: ***REMOVED***oikos_vector_layer_group***REMOVED***,
    icon: Layers3
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: ***REMOVED***oikos_vector_module***REMOVED***,
      defaultImportUrl: searchURL({
        type: ***REMOVED***layer_group***REMOVED***,
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorModules,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosModule,
      schema: oikosModuleSchema as JSONSchema6,
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***oikos_vector_module***REMOVED***,
          childObjectTypeSlug: ***REMOVED***oikos_vector_layer_group***REMOVED***,
          parentMatchField: ***REMOVED***id***REMOVED***,
          childMatchField: ***REMOVED***module_id***REMOVED***,
          predicate: ***REMOVED***has_parent***REMOVED***,
        }
      ]
    }),
    label: ***REMOVED***Oikos  Module***REMOVED***,
    type: ***REMOVED***oikos_vector_module***REMOVED***,
    icon: LayersPlus
  },
]

export const importConfigsByKey = Object.fromEntries(importConfigs.map((config) => [config.type, config]))
export default importConfigs
