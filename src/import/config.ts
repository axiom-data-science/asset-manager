import { ChartBarBig, Grid2X2, Grid2X2Plus, Layers2, Layers3, LayersPlus, Ship, Thermometer } from 'lucide-react'
import type { IImportPageProps } from './pages/import_records_page_impl'
import type { JSONSchema6 } from 'json-schema'
import oikosLayerSchema from './schemas/oikos_layer.schema.json'
import oikosLayerGroupSchema from './schemas/oikos_layer_group.schema.json'
import oikosModuleSchema from './schemas/oikos_module.schema.json'
import { createRemoteImportAdapter } from './adapters'
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
} from './services'

const importConfigs: IImportPageProps[] = [
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'moving_platform',
      defaultImportUrl: searchURL({
        type: 'platform2',
        count: 100,
        portal_id: 25,
      }),
      discover: searchDocs,
      defaultDetailRoot: PLATFORM_ROOT,
      load: movingPlatform,
    }),
    label: 'Moving Platform',
    type: 'moving_platform',
    icon: Ship
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'sensor_station',
      defaultImportUrl: searchURL({
        type: 'sensor_station',
        count: 100,
        portal_id: 25,
      }),
      defaultDetailRoot: SENSORS_ROOT,
      discover: searchDocs,
      load: sensorStation,
    }),
    label: 'Sensor Station',
    type: 'sensor_station',
    icon: Thermometer
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'oikos_model',
      defaultImportUrl: defaultOikosModelsURL,
      discover: oikosModels,
      defaultDetailRoot: 'UNUSED',
      load: oikosModel,
      relationshipRules: [
        {
          parentObjectTypeSlug: 'oikos_model',
          childObjectTypeSlug: 'oikos_model_variable',
          parentMatchField: 'slug',
          childMatchField: 'modelSlug',
          predicate: 'has_parent',
        }
      ]
    }),
    label: 'Oikos Model',
    type: 'oikos_model',
    icon: Grid2X2
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'oikos_model_variable',
      defaultImportUrl: defaultOikosModelsURL,
      discover: oikosModelVariables,
      defaultDetailRoot: 'UNUSED',
      load: oikosModelVariable,
    }),
    label: 'Oikos Model Variable',
    type: 'oikos_model_variable',
    icon: Grid2X2Plus,

  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'binner_record',
      defaultImportUrl: defaultBinninatorRecordsURL,
      discover: binninatorRecords,
      defaultDetailRoot: binninatorRoot,
      load: binninatorMetadata,
    }),
    label: 'Binner Record',
    type: 'binner_record',
    icon: ChartBarBig
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'oikos_vector_layer',
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorLayers,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosLayer,
      schema: oikosLayerSchema as JSONSchema6
    }),
    label: 'Oikos Vector Layer',
    type: 'oikos_vector_layer',
    icon: Layers2
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'oikos_vector_layer_group',
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorLayerGroups,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosLayerGroup,
      schema: oikosLayerGroupSchema as JSONSchema6,
      relationshipRules: [
        {
          parentObjectTypeSlug: 'oikos_vector_layer_group',
          childObjectTypeSlug: 'oikos_vector_layer',
          parentMatchField: 'id',
          childMatchField: 'layer_group_id',
          predicate: 'has_parent',
        }
      ]
    }),
    label: 'Oikos Vector Layer Group',
    type: 'oikos_vector_layer_group',
    icon: Layers3
  },
  {
    sourceAdapter: createRemoteImportAdapter({
      id: 'oikos_vector_module',
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      discover: oikosVectorModules,
      defaultDetailRoot: OIKOS_URL_ROOT,
      load: oikosModule,
      schema: oikosModuleSchema as JSONSchema6,
      relationshipRules: [
        {
          parentObjectTypeSlug: 'oikos_vector_module',
          childObjectTypeSlug: 'oikos_vector_layer_group',
          parentMatchField: 'id',
          childMatchField: 'module_id',
          predicate: 'has_parent',
        }
      ]
    }),
    label: 'Oikos  Module',
    type: 'oikos_vector_module',
    icon: LayersPlus
  },
]

export const importConfigsByKey = Object.fromEntries(importConfigs.map((config) => [config.type, config]))
export default importConfigs
