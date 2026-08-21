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

const importConfigs: Record<string, IImportPageProps> = {
  moving_platforms: {
    defaultImportUrl: searchURL({
      type: 'platform2',
      count: 100,
      portal_id: 25,
    }),
    service: searchDocs,
    defaultDetailRoot: PLATFORM_ROOT,
    getFullDoc: movingPlatform,
    label: 'Moving Platform',
  },
  sensor_stations: {
    defaultImportUrl: searchURL({
      type: 'sensor_station',
      count: 100,
      portal_id: 25,
    }),
    defaultDetailRoot: SENSORS_ROOT,
    service: searchDocs,
    getFullDoc: sensorStation,
    label: 'Sensor Station',
  },
  oikos_models: {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModels,
    defaultDetailRoot: 'UNUSED',
    getFullDoc: oikosModel,
    label: 'Oikos Model',
  },
  oikos_model_variables: {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModelVariables,
    defaultDetailRoot: 'UNUSED',
    getFullDoc: oikosModelVariable,
    label: 'Oikos Model Variable',
  },
  binner_records: {
    defaultImportUrl: defaultBinninatorRecordsURL,
    service: binninatorRecords,
    defaultDetailRoot: binninatorRoot,
    getFullDoc: binninatorMetadata,
    label: 'Binner Record',
  },
  oikos_vector_layers: {
    defaultImportUrl: searchURL({
      type: 'layer_group',
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayers,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayer,
    label: 'Oikos Vector Layer',
  },
  oikos_vector_layer_groups: {
    defaultImportUrl: searchURL({
      type: 'layer_group',
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayerGroups,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayerGroup,
    label: 'Oikos Vector Layer Group',
  },
  oikos_vector_modules: {
    defaultImportUrl: searchURL({
      type: 'layer_group',
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorModules,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosModule,
    label: 'Oikos  Module',
  },
}

export default importConfigs
