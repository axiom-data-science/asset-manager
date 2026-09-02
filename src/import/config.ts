import { ChartBarBig, Grid2X2, Grid2X2Plus, Layers2, Layers3, LayersPlus, Ship, Thermometer } from 'lucide-react'
import type { IImportPageProps } from './pages/import_records_page_impl'
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
    remoteSource: {
      defaultImportUrl: searchURL({
        type: 'platform2',
        count: 100,
        portal_id: 25,
      }),
      service: searchDocs,
      defaultDetailRoot: PLATFORM_ROOT,
      getFullDoc: movingPlatform,
    },
    label: 'Moving Platform',
    type: 'moving_platform',
    icon: Ship
  },
  {
    remoteSource: {
      defaultImportUrl: searchURL({
        type: 'sensor_station',
        count: 100,
        portal_id: 25,
      }),
      defaultDetailRoot: SENSORS_ROOT,
      service: searchDocs,
      getFullDoc: sensorStation,
    },
    label: 'Sensor Station',
    type: 'sensor_station',
    icon: Thermometer
  },
  {
    remoteSource: {
      defaultImportUrl: defaultOikosModelsURL,
      service: oikosModels,
      defaultDetailRoot: 'UNUSED',
      getFullDoc: oikosModel,
    },
    label: 'Oikos Model',
    type: 'oikos_model',
    icon: Grid2X2
  },
  {
    remoteSource: {
      defaultImportUrl: defaultOikosModelsURL,
      service: oikosModelVariables,
      defaultDetailRoot: 'UNUSED',
      getFullDoc: oikosModelVariable,
    },
    label: 'Oikos Model Variable',
    type: 'oikos_model_variable',
    icon: Grid2X2Plus
  },
  {
    remoteSource: {
      defaultImportUrl: defaultBinninatorRecordsURL,
      service: binninatorRecords,
      defaultDetailRoot: binninatorRoot,
      getFullDoc: binninatorMetadata,
    },
    label: 'Binner Record',
    type: 'binner_record',
    icon: ChartBarBig
  },
  {
    remoteSource: {
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      service: oikosVectorLayers,
      defaultDetailRoot: OIKOS_URL_ROOT,
      getFullDoc: oikosLayer,
    },
    label: 'Oikos Vector Layer',
    type: 'oikos_vector_layer',
    icon: Layers2
  },
  {
    remoteSource: {
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      service: oikosVectorLayerGroups,
      defaultDetailRoot: OIKOS_URL_ROOT,
      getFullDoc: oikosLayerGroup,
    },
    label: 'Oikos Vector Layer Group',
    type: 'oikos_vector_layer_group',
    icon: Layers3
  },
  {
    remoteSource: {
      defaultImportUrl: searchURL({
        type: 'layer_group',
        count: 100,
        portal_id: 25,
      }),
      service: oikosVectorModules,
      defaultDetailRoot: OIKOS_URL_ROOT,
      getFullDoc: oikosModule,
    },
    label: 'Oikos  Module',
    type: 'oikos_vector_module',
    icon: LayersPlus
  },
]

export const importConfigsByKey = Object.fromEntries(importConfigs.map((config) => [config.type, config]))
export default importConfigs
