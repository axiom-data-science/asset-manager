export const erddapFixtureCatalogUrl = 'https://fixture.example.test/erddap/info/index.json'
export const erddapFixtureMetadataUrl = 'https://fixture.example.test/erddap/info/north_buoy/index.json'

export const erddapFixtureCatalogResponse = {
    table: {
        columnNames: ['griddap', 'Title', 'Summary', 'Dataset ID'],
        rows: [[
            'https://fixture.example.test/erddap/griddap/north_buoy',
            'North Buoy',
            'Hourly observations from a coastal buoy.',
            'north_buoy',
        ]],
    },
}

export const erddapFixtureMetadataResponse = {
    table: {
        columnNames: ['Row Type', 'Variable Name', 'Attribute Name', 'Data Type', 'Value'],
        rows: [
            ['attribute', 'NC_GLOBAL', 'title', 'String', 'North Buoy'],
            ['attribute', 'NC_GLOBAL', 'summary', 'String', 'Hourly observations from a coastal buoy.'],
            ['attribute', 'NC_GLOBAL', 'id', 'String', 'NB-01'],
            ['attribute', 'NC_GLOBAL', 'geospatial_lat_min', 'double', '41.25'],
            ['attribute', 'NC_GLOBAL', 'geospatial_lat_max', 'double', '41.75'],
            ['attribute', 'NC_GLOBAL', 'is_live', 'boolean', 'true'],
            ['attribute', 'NC_GLOBAL', 'history', 'String', 'Imported from the fixture catalog.'],
            ['attribute', 'sea_water_temperature', 'units', 'String', 'degree_C'],
            ['attribute', 'sea_water_temperature', 'actual_range', 'double', '-2.5, 32.0'],
            ['attribute', 'sea_water_temperature', '_FillValue', 'float', '-9999'],
            ['attribute', 'time', 'units', 'String', 'seconds since 2024-01-01T00:00:00Z'],
        ],
    },
}

type ERDDAPFixtureRequest = {
    url: string
    method: string
    headers: Record<string, string>
}

const authHeaderNames = new Set([
    'authorization',
    'proxy-authorization',
    'x-auth-token',
    'x-access-token',
])

export const createERDDAPFixtureRuntime = () => {
    const requests: ERDDAPFixtureRequest[] = []
    const fetch: typeof globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : undefined
        const url = new URL(
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        ).href
        const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
        const headers = new Headers(request?.headers)
        new Headers(init?.headers).forEach((value, name) => headers.set(name, value))
        const recordedHeaders = Object.fromEntries(headers.entries())
        requests.push({ url, method, headers: recordedHeaders })

        if (method !== 'GET') throw new Error(`Unexpected ERDDAP fixture method: ${method}`)
        if ([...headers.keys()].some((name) => authHeaderNames.has(name.toLowerCase()))) {
            throw new Error('ERDDAP fixture requests must not include authentication headers.')
        }
        const signal = init?.signal ?? request?.signal
        signal?.throwIfAborted()

        const response = url === erddapFixtureCatalogUrl
            ? erddapFixtureCatalogResponse
            : url === erddapFixtureMetadataUrl
                ? erddapFixtureMetadataResponse
                : undefined
        if (!response) throw new Error(`Unexpected ERDDAP fixture URL: ${url}`)

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })
    }

    return { fetch, requests }
}