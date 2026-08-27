import { ChartBarBig, Grid2X2, Grid2X2Plus, Layers2, Layers3, LayersPlus, Ship, Thermometer } from ***REMOVED***lucide-react***REMOVED***
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

const importConfigs: IImportPageProps[] = [
  {
    defaultImportUrl: searchURL({
      type: ***REMOVED***platform2***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: searchDocs,
    defaultDetailRoot: PLATFORM_ROOT,
    getFullDoc: movingPlatform,
    label: ***REMOVED***Moving Platform***REMOVED***,
    type: ***REMOVED***moving_platform***REMOVED***,
    icon: Ship
  },
  {
    defaultImportUrl: searchURL({
      type: ***REMOVED***sensor_station***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    defaultDetailRoot: SENSORS_ROOT,
    service: searchDocs,
    getFullDoc: sensorStation,
    label: ***REMOVED***Sensor Station***REMOVED***,
    type: ***REMOVED***sensor_station***REMOVED***,
    icon: Thermometer
  },
  {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModels,
    defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
    getFullDoc: oikosModel,
    label: ***REMOVED***Oikos Model***REMOVED***,
    type: ***REMOVED***oikos_model***REMOVED***,
    icon: Grid2X2
  },
  {
    defaultImportUrl: defaultOikosModelsURL,
    service: oikosModelVariables,
    defaultDetailRoot: ***REMOVED***UNUSED***REMOVED***,
    getFullDoc: oikosModelVariable,
    label: ***REMOVED***Oikos Model Variable***REMOVED***,
    type: ***REMOVED***oikos_model_variable***REMOVED***,
    icon: Grid2X2Plus
  },
  {
    defaultImportUrl: defaultBinninatorRecordsURL,
    service: binninatorRecords,
    defaultDetailRoot: binninatorRoot,
    getFullDoc: binninatorMetadata,
    label: ***REMOVED***Binner Record***REMOVED***,
    type: ***REMOVED***binner_record***REMOVED***,
    icon: ChartBarBig
  },
  {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayers,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayer,
    label: ***REMOVED***Oikos Vector Layer***REMOVED***,
    type: ***REMOVED***oikos_vector_layer***REMOVED***,
    icon: Layers2
  },
  {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorLayerGroups,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosLayerGroup,
    label: ***REMOVED***Oikos Vector Layer Group***REMOVED***,
    type: ***REMOVED***oikos_vector_layer_group***REMOVED***,
    icon: Layers3
  },
  {
    defaultImportUrl: searchURL({
      type: ***REMOVED***layer_group***REMOVED***,
      count: 100,
      portal_id: 25,
    }),
    service: oikosVectorModules,
    defaultDetailRoot: OIKOS_URL_ROOT,
    getFullDoc: oikosModule,
    label: ***REMOVED***Oikos  Module***REMOVED***,
    type: ***REMOVED***oikos_vector_module***REMOVED***,
    icon: LayersPlus
  },
]

export const importConfigsByKey = Object.fromEntries(importConfigs.map((config) => [config.type, config]))
export default importConfigs
