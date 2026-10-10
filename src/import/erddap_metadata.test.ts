import { describe, expect, it } from 'vitest'
import {
    createERDDAPMetadataAdapter,
    createERDDAPSchemaTargetedAdapter,
    createERDDAPVariableMetadataAdapter,
    parseERDDAPCatalog,
    parseERDDAPMetadata,
} from './erddap_metadata'
import type { JSONSchema6 } from 'json-schema'

const metadataUrl = 'https://example.org/erddap/info/station_1/index.json'
const metadataResponse = {
    table: {
        columnNames: ['Row Type', 'Variable Name', 'Attribute Name', 'Data Type', 'Value'],
        rows: [
            ['attribute', 'NC_GLOBAL', 'title', 'String', 'Station One'],
            ['attribute', 'NC_GLOBAL', 'summary', 'String', 'A sample station'],
            ['attribute', 'temperature', 'units', 'String', 'degree_C'],
        ],
    },
}
const catalogUrl = 'https://example.org/erddap/info/index.json'
const searchUrl = 'https://example.org/erddap/search/index.json?page=1&itemsPerPage=100'
const catalogResponse = {
    table: {
        columnNames: ['griddap', 'Title', 'Summary', 'Dataset ID'],
        rows: [
            ['https://example.org/erddap/griddap/station_1', 'Station One', 'First station', 'station_1'],
            ['', 'Station Two', 'Second station', 'station_2'],
        ],
    },
}

describe('ERDDAP metadata import', () => {
    it('discovers one candidate per catalog dataset', () => {
        const candidates = parseERDDAPCatalog(catalogResponse, catalogUrl)

        expect(candidates).toHaveLength(2)
        expect(candidates[0]).toMatchObject({
            uuid: 'station_1',
            slug: 'station_1',
            label: 'Station One',
            description: 'First station',
            partial: true,
            data: {
                dataset_id: 'station_1',
                metadata_url: 'https://example.org/erddap/info/station_1/index.json',
            },
        })
    })

    it('discovers datasets from a search URL and builds info metadata URLs', async () => {
        const adapter = createERDDAPMetadataAdapter()
        const originalFetch = globalThis.fetch
        globalThis.fetch = async () =>
            new Response(JSON.stringify(catalogResponse), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })

        try {
            const candidates = await adapter.discover({
                url: searchUrl,
                signal: new AbortController().signal,
            })

            expect(candidates[0]).toMatchObject({
                uuid: 'station_1',
                partial: true,
                data: {
                    metadata_url: 'https://example.org/erddap/info/station_1/index.json',
                },
            })
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('separates global and per-variable attributes', () => {
        expect(parseERDDAPMetadata(metadataResponse, metadataUrl)).toEqual({
            dataset_id: 'station_1',
            metadata_url: metadataUrl,
            global_attributes: {
                title: 'Station One',
                summary: 'A sample station',
            },
            variables: {
                temperature: { units: 'degree_C' },
            },
        })
    })

    it('discovers one canonical dataset record and retains its source metadata', async () => {
        const adapter = createERDDAPMetadataAdapter()
        const originalFetch = globalThis.fetch
        globalThis.fetch = async () =>
            new Response(JSON.stringify(metadataResponse), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })

        try {
            const [candidate] = await adapter.discover({ url: metadataUrl, signal: new AbortController().signal })
            expect(candidate).toMatchObject({
                uuid: 'station_1',
                slug: 'station_1',
                label: 'Station One',
                description: 'A sample station',
                partial: false,
            })

            const record = await adapter.load({ candidate })
            expect(record.data).toEqual(candidate.data)
            expect(record.sourceData).toEqual(candidate.data)
            expect(record.provenance.externalId).toBe('station_1')
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('maps typed global attributes to matching schema properties for targeted imports', async () => {
        const adapter = createERDDAPSchemaTargetedAdapter({
            id: 'erddap_modl',
            schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    id: { type: 'string' },
                    DX: { type: 'number' },
                    infoURL: { type: 'string' },
                },
            } as JSONSchema6,
        })
        const originalFetch = globalThis.fetch
        const targetedResponse = {
            table: {
                columnNames: ['Row Type', 'Variable Name', 'Attribute Name', 'Data Type', 'Value'],
                rows: [
                    ['attribute', 'NC_GLOBAL', 'title', 'String', 'Station One'],
                    ['attribute', 'NC_GLOBAL', 'DX', 'float', '12000.0'],
                    ['attribute', 'NC_GLOBAL', 'infoUrl', 'String', 'https://example.org/info'],
                ],
            },
        }
        globalThis.fetch = async () =>
            new Response(JSON.stringify(targetedResponse), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })

        try {
            const [candidate] = await adapter.discover({
                url: metadataUrl,
                signal: new AbortController().signal,
            })
            const record = await adapter.load({ candidate })

            expect(record.provenance.sourceId).toBe('erddap_modl')
            expect(record.data).toEqual({
                title: 'Station One',
                id: 'station_1',
                DX: 12000,
                infoURL: 'https://example.org/info',
            })
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('retains configured relationship rules on the targeted adapter', () => {
        const relationshipRules = [{
            parentObjectTypeSlug: 'modl',
            childObjectTypeSlug: 'modl_variable_metadata',
            parentMatchField: 'slug',
            childMatchField: 'dataset_id',
            predicate: 'has_parent',
        }]
        const adapter = createERDDAPSchemaTargetedAdapter({
            id: 'erddap_modl',
            schema: { type: 'object' } as JSONSchema6,
            relationshipRules,
        })

        expect(adapter.relationshipRules).toEqual(relationshipRules)
    })

    it('groups all variable attributes into one dataset-linked metadata record', async () => {
        const adapter = createERDDAPVariableMetadataAdapter()
        const originalFetch = globalThis.fetch
        const variableResponse = {
            table: {
                columnNames: ['Row Type', 'Variable Name', 'Attribute Name', 'Data Type', 'Value'],
                rows: [
                    ['attribute', 'NC_GLOBAL', 'title', 'String', 'Station One'],
                    ['attribute', 'temperature', 'units', 'String', 'degree_C'],
                    ['attribute', 'temperature', 'actual_range', 'double', '-10, 45'],
                    ['attribute', 'time', 'units', 'String', 'seconds since 2020-01-01'],
                ],
            },
        }
        globalThis.fetch = async () =>
            new Response(JSON.stringify(variableResponse), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })

        try {
            const [candidate] = await adapter.discover({
                url: metadataUrl,
                signal: new AbortController().signal,
            })
            const record = await adapter.load({ candidate })

            expect(record.provenance.sourceId).toBe('erddap_modl_variable_metadata')
            expect(record.data).toEqual({
                dataset_id: 'station_1',
                variables: {
                    temperature: {
                        variable_name: 'temperature',
                        units: 'degree_C',
                        actual_range: [-10, 45],
                    },
                    time: {
                        variable_name: 'time',
                        units: 'seconds since 2020-01-01',
                    },
                },
            })
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('keeps targeted identity when discovering and preloading from a search URL', async () => {
        const adapter = createERDDAPSchemaTargetedAdapter({
            id: 'erddap_modl',
            schema: {
                type: 'object',
                properties: { title: { type: 'string' }, id: { type: 'string' } },
            } as JSONSchema6,
        })
        const originalFetch = globalThis.fetch
        const requestedUrls: string[] = []
        globalThis.fetch = async (input) => {
            const requestedUrl = String(input)
            requestedUrls.push(requestedUrl)
            const body = requestedUrl === searchUrl ? catalogResponse : metadataResponse
            return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })
        }

        try {
            const [candidate] = await adapter.discover({
                url: searchUrl,
                signal: new AbortController().signal,
            })
            const record = await adapter.load({ candidate })

            expect(candidate.provenance.sourceId).toBe('erddap_modl')
            expect(requestedUrls).toEqual([
                searchUrl,
                'https://example.org/erddap/info/station_1/index.json',
            ])
            expect(record.data).toEqual({ title: 'Station One', id: 'station_1' })
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('loads full metadata for a dataset discovered from the catalog', async () => {
        const adapter = createERDDAPMetadataAdapter()
        const originalFetch = globalThis.fetch
        const requestedUrls: string[] = []
        globalThis.fetch = async (input) => {
            const requestedUrl = String(input)
            requestedUrls.push(requestedUrl)
            const body = requestedUrl === catalogUrl ? catalogResponse : metadataResponse
            return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })
        }

        try {
            const [candidate] = await adapter.discover({
                url: catalogUrl,
                signal: new AbortController().signal,
            })
            const record = await adapter.load({ candidate })

            expect(requestedUrls).toEqual([
                catalogUrl,
                'https://example.org/erddap/info/station_1/index.json',
            ])
            expect(record.label).toBe('Station One')
            expect(record.data).toMatchObject({
                global_attributes: { title: 'Station One', summary: 'A sample station' },
                variables: { temperature: { units: 'degree_C' } },
            })
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    it('rejects metadata responses without the ERDDAP table shape', () => {
        expect(() => parseERDDAPMetadata({}, metadataUrl)).toThrow(
            'ERDDAP metadata response is missing table columns or rows'
        )
    })
})