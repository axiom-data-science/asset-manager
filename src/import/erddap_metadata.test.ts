import { describe, expect, it } from 'vitest'
import {
    createERDDAPMetadataAdapter,
    parseERDDAPCatalog,
    parseERDDAPMetadata,
} from './erddap_metadata'

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