import type { IImportPageProps } from ***REMOVED***./pages/import_records_page_impl***REMOVED***
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

const importConfigs: Record<string, IImportPageProps> = {
  moving_platforms: {
    defaultImportUrl: searchURL({
      type: ***REMOVED***platform2***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: searchDocs,
    defaultDetailRoot: PLATFORM_ROOT,
    getFullDoc: movingPlatform,
    label: ***REMOVED***Moving Platform***REMOVED***,
  },
  sensor_stations: {
    defaultImportUrl: searchURL({
      type: ***REMOVED***sensor_station***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    defaultDetailRoot: SENSORS_ROOT,
    service: searchDocs,
    getFullDoc: sensorStation,
    label: ***REMOVED***Sensor Station***REMOVED***,
  },
  oikos_models: {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModels,
    defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
    getFullDoc: oikosModel,
    label: ***REMOVED***Oikos Model***REMOVED***,
  },
  oikos_model_variables: {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModelVariables,
    defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
    getFullDoc: oikosModelVariable,
    label: ***REMOVED***Oikos Model Variable***REMOVED***,
  },
  binner_records: {
    defaultImportUrl: defaultBinninatorRecordsURL,
    service: binninatorRecords,
    defaultDetailRoot: binninatorRoot,
    getFullDoc: binninatorMetadata,
    label: ***REMOVED***Binner Record***REMOVED***,
  },
  oikos_vector_layers: {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayers,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayer,
    label: ***REMOVED***Oikos Vector Layer***REMOVED***,
  },
  oikos_vector_layer_groups: {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayerGroups,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayerGroup,
    label: ***REMOVED***Oikos Vector Layer Group***REMOVED***,
  },
  oikos_vector_modules: {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorModules,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosModule,
    label: ***REMOVED***Oikos  Module***REMOVED***,
  },
}

export default importConfigs
