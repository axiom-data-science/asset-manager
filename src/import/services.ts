import type { IDocumentImport, IFullDocForImport, ISearchRecord } from "@/import/types"
import { omit } from "lodash"

const searchURLRoot = 'https://search.axds.co/v2/search'

export const searchURL = ({ type = 'sensor_station', count = 10, portal_id = -1 }: { type: string, count: number, portal_id: number }): string => {
    return `${searchURLRoot}?portalId=${portal_id}&page=1&pageSize=${count}&type=${type}`
}

const getSearchResults = async<T = unknown>({ url, signal }: { url: string, signal?: AbortSignal }): Promise<ISearchRecord<T>[]> => {
    const response = await (await (fetch(url, {
        signal,
        headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        },
    }))).json()
    return response.results
}


export const searchDocs = async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const results = await getSearchResults<{ layers: { type: string, uuid: string }[] }>({ url, signal })
    return results?.map((item: ISearchRecord<{ layers: { type: string, uuid: string }[] }>) => {
        return {
            uuid: item.type === 'sensor_station' ? item.id : item.uuid,
            slug: `${item.id}`,
            label: item.label,
            data: item.source ?? item.data,
            partial: !item.source

        }
    })
}

const BINNINATOR_ROOT = 'https://binning-service.srv.axds.co'

export const binninatorRoot = BINNINATOR_ROOT
export const defaultBinninatorRecordsURL = `${BINNINATOR_ROOT}/source/h3-me`

export const binninatorRecords = async ({ url = `${BINNINATOR_ROOT}/source/h3-me`, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const urls = Array.isArray(url) ? url : [url]
    const all: string[] = await Promise.all(urls.map(async (u) => {
        const d = await (await fetch(u, { signal })).json()
        return d.metadata.dataset_uuids
    }))
    return all.flat().map((uuid: string) => {
        return {
            slug: `${uuid}`,
            uuid,
            label: uuid,
            data: {},
            partial: true
        }
    })
}



export const oikosVectorLayerGroups = async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const results = await getSearchResults<{ layers: { type: string, uuid: string }[] }>({ url: `${url}&verbose=true`, signal })
    const layerGroups = results.filter(item => {
        const layers = item.source.layers.filter(layer => layer.type === 'VECTOR')
        return layers.length > 0
    })

    return layerGroups.map((item: ISearchRecord<{ layers: { type: string, uuid: string }[] }>) => {
        return {
            slug: `${item.id}`,
            uuid: item.uuid,
            label: item.label,
            data: item.source ?? item.data,
            partial: !item.source
        }
    })
}

export const oikosVectorModules = async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const layerGroups = await oikosVectorLayerGroups({ url, signal })
    return layerGroups.map((item: IDocumentImport) => {
        const data = item.data as { module_uuid: string, module_label: string }
        return {
            slug: `${data.module_uuid}`,
            label: data.module_label,
            uuid: data.module_uuid,
            data: {
                uuid: data.module_uuid,
                label: data.module_label
            },
            partial: true
        }
    })
}


export const oikosVectorLayers = async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const results = await getSearchResults<{ layers: { type: string, label: string, uuid: string, id: number }[] }>({ url: `${url}&verbose=true`, signal })
    const layerGroups = results.filter(item => {
        const layers = item.source.layers.filter(layer => layer.type === 'VECTOR')
        return layers.length > 0
    })
    const layers = layerGroups.map(item => item.source.layers.filter(layer => layer.type === 'VECTOR')).flat()
    return layers.map((layer) => {
        return {
            slug: `${layer.id}`,
            uuid: layer.uuid,
            label: layer.label,
            data: layer
        }
    })
}


export const OIKOS_URL_ROOT = 'https://oikos.axds.co/rest'
export const defaultOikosModelsURL = `${OIKOS_URL_ROOT}/modelinfo`

export const oikosModels = async ({ url, signal }: { url?: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const u = url || defaultOikosModelsURL
    const j = await (await fetch(u, {
        signal, headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        }
    })).json()
    return j.map((model: { uuid: string, slug: string, label: string, description: string }) => {
        return {
            slug: `${model.slug}`,
            uuid: model.uuid,
            label: model.label,
            description: model.description,
            data: omit(model, 'modelVariables')
        }
    })
}

export const oikosModelVariables = async ({ url, signal }: { url: string, signal?: AbortSignal }): Promise<IDocumentImport[]> => {
    const u = url || `${OIKOS_URL_ROOT}/modelinfo`
    const j = await (await fetch(u, {
        signal, headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        }
    })).json()
    return j.map((model: { uuid: string, slug: string, label: string, modelVariables: { label: string, uuid: string } & Record<string, unknown>[] }) => {
        return model.modelVariables.map(v => ({
            ...v,
            modelSlug: model.slug
        }))
    }).flat().map((variable: { label: string, uuid: string } & Record<string, unknown>) => {
        return {
            slug: `${variable.modelSlug}_${variable.variableName}`,
            uuid: variable.uuid,
            label: variable.label,
            data: variable
        }
    })
}

// DETAIL REQUESTS

export const binninatorMetadata = async ({ doc, url, signal }: { doc: IDocumentImport, url?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    const u = url || `${BINNINATOR_ROOT}/${uuid}/metadata`
    const d = await (await fetch(u, { signal })).json()
    return {
        slug: `binner:${uuid.replaceAll('-', '_')}`,
        label: uuid,
        description: '',
        data: d.metadata,
        attrs: {}
    }
}


export const oikosModelVariable = async ({ doc }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    return {
        slug: doc.slug,
        label: doc.label,
        description: '',
        data: doc.data,
        attrs: {}
    }
}

export const oikosModel = async ({ doc }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    return {
        slug: `${doc.slug}`,
        label: doc.label,
        description: doc.description ?? '',
        data: doc.data,
        attrs: {}
    }
}


export const oikosLayer = async ({ doc, url, serviceRoot = OIKOS_URL_ROOT, signal }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    const u = url || `${serviceRoot}/layer?uuid=${uuid}`
    const j = await (await fetch(u, {
        signal, headers: {
            'content-type': 'application/json',
            accept: 'application/json'
        }
    })).json()
    return {
        slug: doc.slug,
        label: j.label,
        description: j.description,
        data: j,
        attrs: {}
    }
}

export const oikosLayerGroup = async ({ doc, url, serviceRoot = OIKOS_URL_ROOT, signal }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    const u = url || `${serviceRoot}/layer-group?uuid=${uuid}`
    const j = await (await fetch(u, {
        signal, headers: {
            'content-type': 'application/json',
            accept: 'application/json'
        }
    })).json()
    return {
        slug: doc.slug,
        label: j.label,
        description: j.description,
        data: j,
        attrs: {}
    }
}




export const oikosModule = async ({ doc, url, serviceRoot = OIKOS_URL_ROOT, signal }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    const u = url || `${serviceRoot}/module?uuid=${uuid}`
    const j = await (await fetch(u, {
        signal, headers: {
            'content-type': 'application/json',
            accept: 'application/json'
        }
    })).json()
    return {
        slug: doc.slug,
        label: j.module.label,
        description: j.module.description ?? '',
        data: {
            ...j.module,
            layerGroups: (j.layerGroups as Array<{ uuid: string }>).map(lg => lg.uuid),
            layers: (j.dataLayers.concat(j.vectorLayers.concat(j.rasterLayers)) as Array<{ uuid: string }>).map(l => l.uuid),
            stickyLayerGroups: (j.stickyLayerGroups as Array<{ uuid: string }>).map(lg => lg.uuid)
        },
        attrs: {}
    }
}


export const SENSORS_ROOT = 'https://sensors.axds.co/api'

export const sensorStation = async ({ doc, url, serviceRoot = SENSORS_ROOT, signal }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    if (!url && isNaN(Number(uuid))) throw new Error('uuid must be a number - use station id, not uuid')
    const u = url || `${serviceRoot}/metadata/filter/custom?filter=${encodeURIComponent(JSON.stringify({ "stations": [uuid] }))}`
    const j = await (await fetch(u, { signal })).json()
    const station = j?.data?.stations?.[0]
    return {
        slug: doc.slug.replace('sensor_station:', ''),
        label: station.label,
        description: '',
        data: station,
        attrs: {}
    }
}

export const PLATFORM_ROOT = 'https://platforms.axds.co'

export const movingPlatform = async ({ doc, url, serviceRoot = PLATFORM_ROOT, signal }: { doc: IDocumentImport, url?: string, serviceRoot?: string, signal?: AbortSignal }): Promise<IFullDocForImport> => {
    const uuid = doc.uuid
    if (!uuid && !url) throw new Error('Must provide either uuid or url')
    const u = url || `${serviceRoot}/platforms/${uuid}`
    const j = await (await fetch(u, { signal })).json()
    return {
        slug: doc.slug,
        label: j.base.attributes.title,
        description: j.base.attributes.summary ?? '',
        data: {
            ...j,
            uuid: j.base.attributes.packrat_uuid
        },
        attrs: {}
    }
}
