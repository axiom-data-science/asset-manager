import type {
    CanonicalImportRecord,
    ImportCandidate,
    ImportCompositeSourceAdapter,
    ImportSourceAdapter,
} from './types'
import type { JSONSchema6 } from 'json-schema'

type ERDDAPMetadataTable = {
    columnNames?: string[]
    rows?: unknown[][]
}

type ERDDAPMetadataResponse = {
    table?: ERDDAPMetadataTable
}

export type ERDDAPDatasetMetadata = {
    dataset_id: string
    metadata_url: string
    global_attributes: Record<string, unknown>
    variables: Record<string, Record<string, unknown>>
}

type ERDDAPMetadataAdapterOptions = {
    id?: string
    coerceAttributeValues?: boolean
}

const normalizeColumnName = (columnName: string): string =>
    columnName.toLowerCase().replace(/[^a-z0-9]/g, '')

const getColumnIndex = (columnNames: string[], name: string): number =>
    columnNames.findIndex((columnName) => normalizeColumnName(columnName) === normalizeColumnName(name))

const coerceERDDAPAttributeValue = (
    value: unknown,
    dataType: unknown,
    attributeName: string
): unknown => {
    if (typeof value !== 'string') return value
    if (normalizeColumnName(attributeName) === 'actualrange') {
        const range = value.split(',').map((part) => Number(part.trim()))
        return range.length === 2 && range.every(Number.isFinite) ? range : value
    }
    if (typeof dataType !== 'string') return value
    if (/^(?:u?byte|u?short|u?int|u?long|integer|float|double)$/i.test(dataType)) {
        const numericValue = Number(value)
        return Number.isFinite(numericValue) ? numericValue : value
    }
    if (/^(?:boolean|bool)$/i.test(dataType)) {
        if (value.toLowerCase() === 'true') return true
        if (value.toLowerCase() === 'false') return false
    }
    return value
}

const getDatasetId = (url: string): string => {
    const match = new URL(url).pathname.match(/\/info\/([^/]+)\/index\.json\/?$/i)
    if (!match?.[1]) throw new Error('Use an ERDDAP metadata URL ending in /info/{dataset}/index.json')
    return decodeURIComponent(match[1])
}

const isERDDAPDatasetListUrl = (url: string): boolean =>
    /\/(?:info|search)\/index\.json\/?$/i.test(new URL(url).pathname)

const getDatasetMetadataUrl = (catalogUrl: string, datasetId: string): string => {
    const url = new URL(catalogUrl)
    const erddapRoot = url.pathname.match(/^(.*)\/(?:info|search)\/index\.json\/?$/i)?.[1]
    if (erddapRoot === undefined) throw new Error('Use an ERDDAP catalog or search URL ending in /index.json')
    url.pathname = `${erddapRoot}/info/${encodeURIComponent(datasetId)}/index.json`
    url.search = ''
    url.hash = ''
    return url.toString()
}

export const parseERDDAPMetadata = (
    response: ERDDAPMetadataResponse,
    metadataUrl: string,
    options: Pick<ERDDAPMetadataAdapterOptions, 'coerceAttributeValues'> = {}
): ERDDAPDatasetMetadata => {
    const datasetId = getDatasetId(metadataUrl)
    const table = response.table
    if (!table?.columnNames || !Array.isArray(table.rows)) {
        throw new Error('ERDDAP metadata response is missing table columns or rows')
    }

    const variableIndex = getColumnIndex(table.columnNames, 'VariableName')
    const attributeIndex = getColumnIndex(table.columnNames, 'AttributeName')
    const dataTypeIndex = getColumnIndex(table.columnNames, 'Data Type')
    const valueIndex = getColumnIndex(table.columnNames, 'Value')
    if (attributeIndex < 0 || valueIndex < 0) {
        throw new Error('ERDDAP metadata table must include AttributeName and Value columns')
    }

    const globalAttributes: Record<string, unknown> = {}
    const variables: Record<string, Record<string, unknown>> = {}
    for (const row of table.rows) {
        const attributeName = row[attributeIndex]
        if (typeof attributeName !== 'string' || attributeName.length === 0) continue

        const variableName = variableIndex < 0 ? undefined : row[variableIndex]
        const destination =
            typeof variableName === 'string' && variableName.length > 0 && variableName !== 'NC_GLOBAL'
                ? (variables[variableName] ??= {})
                : globalAttributes
        const value = row[valueIndex]
        destination[attributeName] = options.coerceAttributeValues
            ? coerceERDDAPAttributeValue(
                value,
                dataTypeIndex < 0 ? undefined : row[dataTypeIndex],
                attributeName
            )
            : value
    }

    return {
        dataset_id: datasetId,
        metadata_url: metadataUrl,
        global_attributes: globalAttributes,
        variables,
    }
}

export const mapERDDAPMetadataToSchema = (
    metadata: ERDDAPDatasetMetadata,
    schema: JSONSchema6
): Record<string, unknown> => {
    const schemaProperties = Object.keys(schema.properties ?? {})
    const propertyByNormalizedName = new Map(
        schemaProperties.map((propertyName) => [normalizeColumnName(propertyName), propertyName])
    )
    const data: Record<string, unknown> = {}

    for (const [attributeName, value] of Object.entries(metadata.global_attributes)) {
        const propertyName = propertyByNormalizedName.get(normalizeColumnName(attributeName))
        if (propertyName) data[propertyName] = value
    }

    const idPropertyName = propertyByNormalizedName.get('id')
    if (idPropertyName && !data[idPropertyName]) data[idPropertyName] = metadata.dataset_id
    return data
}

export const mapERDDAPMetadataToVariableRecord = (
    metadata: ERDDAPDatasetMetadata
): Record<string, unknown> => ({
    dataset_id: metadata.dataset_id,
    variables: Object.fromEntries(
        Object.entries(metadata.variables).map(([variableName, attributes]) => [
            variableName,
            { variable_name: variableName, ...attributes },
        ])
    ),
})

export const parseERDDAPCatalog = (
    response: ERDDAPMetadataResponse,
    catalogUrl: string,
    sourceId = 'erddap_metadata'
): ImportCandidate[] => {
    const table = response.table
    if (!table?.columnNames || !Array.isArray(table.rows)) {
        throw new Error('ERDDAP catalog response is missing table columns or rows')
    }

    const datasetIdIndex = getColumnIndex(table.columnNames, 'Dataset ID')
    if (datasetIdIndex < 0) throw new Error('ERDDAP catalog table must include a Dataset ID column')
    const titleIndex = getColumnIndex(table.columnNames, 'Title')
    const summaryIndex = getColumnIndex(table.columnNames, 'Summary')
    const datasetIds = new Set<string>()

    return table.rows.flatMap((row) => {
        const datasetId = row[datasetIdIndex]
        if (typeof datasetId !== 'string' || !datasetId.trim() || datasetIds.has(datasetId)) return []
        datasetIds.add(datasetId)

        const title = titleIndex < 0 ? undefined : row[titleIndex]
        const summary = summaryIndex < 0 ? undefined : row[summaryIndex]
        const label = typeof title === 'string' && title.trim() ? title : datasetId
        const description = typeof summary === 'string' ? summary : ''
        const metadataUrl = getDatasetMetadataUrl(catalogUrl, datasetId)

        return [{
            uuid: datasetId,
            slug: datasetId,
            label,
            description,
            data: {
                dataset_id: datasetId,
                metadata_url: metadataUrl,
                global_attributes: { title: label, summary: description },
                variables: {},
            } satisfies ERDDAPDatasetMetadata,
            partial: true,
            provenance: { sourceId, externalId: datasetId },
        }]
    })
}

const getDatasetLabel = (metadata: ERDDAPDatasetMetadata): string => {
    const title = metadata.global_attributes.title
    return typeof title === 'string' && title.trim() ? title : metadata.dataset_id
}

const getDatasetDescription = (metadata: ERDDAPDatasetMetadata): string => {
    const summary = metadata.global_attributes.summary
    return typeof summary === 'string' ? summary : ''
}

export const createERDDAPMetadataAdapter = ({
    id = 'erddap_metadata',
    coerceAttributeValues = false,
}: ERDDAPMetadataAdapterOptions = {}): ImportSourceAdapter => ({
    id,
    defaultImportUrl: '',
    discover: async ({ url, signal }): Promise<ImportCandidate[]> => {
        const response = await fetch(url, {
            signal,
            headers: { accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`ERDDAP metadata request failed (${response.status})`)

        const responseData = (await response.json()) as ERDDAPMetadataResponse
        if (isERDDAPDatasetListUrl(url)) return parseERDDAPCatalog(responseData, url, id)

        const metadata = parseERDDAPMetadata(responseData, url, { coerceAttributeValues })
        return [
            {
                uuid: metadata.dataset_id,
                slug: metadata.dataset_id,
                label: getDatasetLabel(metadata),
                description: getDatasetDescription(metadata),
                data: metadata,
                partial: false,
                provenance: { sourceId: id, externalId: metadata.dataset_id },
            },
        ]
    },
    load: async ({ candidate, signal }): Promise<CanonicalImportRecord> => {
        const catalogMetadata = candidate.data as ERDDAPDatasetMetadata
        const metadata = candidate.partial
            ? await (async () => {
                const response = await fetch(catalogMetadata.metadata_url, {
                    signal,
                    headers: { accept: 'application/json' },
                })
                if (!response.ok) {
                    throw new Error(`ERDDAP dataset metadata request failed (${response.status})`)
                }
                return parseERDDAPMetadata(
                    (await response.json()) as ERDDAPMetadataResponse,
                    catalogMetadata.metadata_url,
                    { coerceAttributeValues }
                )
            })()
            : catalogMetadata

        return {
            uuid: candidate.uuid,
            slug: candidate.slug,
            label: getDatasetLabel(metadata),
            description: getDatasetDescription(metadata),
            attrs: {},
            data: metadata,
            provenance: candidate.provenance,
            sourceData: metadata,
        }
    },
})

export const createERDDAPSchemaTargetedAdapter = ({
    id,
    schema,
    relationshipRules,
}: {
    id: string
    schema: JSONSchema6
    relationshipRules?: ImportSourceAdapter['relationshipRules']
}): ImportSourceAdapter => {
    const metadataAdapter = createERDDAPMetadataAdapter({ id, coerceAttributeValues: true })
    return {
        ...metadataAdapter,
        relationshipRules,
        schema,
        load: async (options) => {
            const record = await metadataAdapter.load(options)
            return {
                ...record,
                data: mapERDDAPMetadataToSchema(record.data as ERDDAPDatasetMetadata, schema),
            }
        },
    }
}

export const createERDDAPVariableMetadataAdapter = (
    id = 'erddap_modl_variable_metadata',
    schema?: JSONSchema6
): ImportSourceAdapter => {
    const metadataAdapter = createERDDAPMetadataAdapter({ id, coerceAttributeValues: true })
    return {
        ...metadataAdapter,
        schema,
        load: async (options) => {
            const record = await metadataAdapter.load(options)
            return {
                ...record,
                data: mapERDDAPMetadataToVariableRecord(record.data as ERDDAPDatasetMetadata),
            }
        },
    }
}

    export const createERDDAPCompositeSourceAdapter = ({
        id = 'erddap_modl_composite',
        datasetSourceId = 'erddap_modl',
        variableSourceId = 'erddap_modl_variable_metadata',
        schema,
    }: {
        id?: string
        datasetSourceId?: string
        variableSourceId?: string
        schema: JSONSchema6
    }): ImportCompositeSourceAdapter => {
        const metadataAdapter = createERDDAPMetadataAdapter({ id, coerceAttributeValues: true })
        return {
            id,
            memberSourceIds: [datasetSourceId, variableSourceId],
            defaultImportUrl: metadataAdapter.defaultImportUrl,
            discover: metadataAdapter.discover,
            load: async (options) => {
                const loaded = await metadataAdapter.load(options)
                const metadata = loaded.sourceData as ERDDAPDatasetMetadata
                const variableRecord: CanonicalImportRecord = {
                    ...loaded,
                    uuid: `${metadata.dataset_id}:variables`,
                    label: `${loaded.label} variable metadata`,
                    description: `Variable metadata for ${loaded.label}`,
                    data: mapERDDAPMetadataToVariableRecord(metadata),
                    provenance: { sourceId: variableSourceId, externalId: metadata.dataset_id },
                }
                const datasetRecord: CanonicalImportRecord = {
                    ...loaded,
                    data: mapERDDAPMetadataToSchema(metadata, schema),
                    provenance: { sourceId: datasetSourceId, externalId: metadata.dataset_id },
                }
                return {
                    [datasetSourceId]: datasetRecord,
                    [variableSourceId]: variableRecord,
                }
            },
        }
    }