import { describe, expect, it } from 'vitest'
import { convertWorkbookSheets, parseWorkbook, parseWorkbookFile } from './workbook'
import { selectWorkbookSheets } from './workbook_selection'
import {
    createCSVMappingFixture,
    createCSVMappingWorkbookArrayBuffer,
    createCSVMappingWorkbookFile,
    csvMappingFixtureText,
    csvMappingFixtureWorksheetData,
} from './testing/csvMappingFixture'

describe('parseWorkbook', () => {
    it('rejects bytes that are not a workbook without requiring authentication', async () => {
        const bytes = new TextEncoder().encode('not an XLSX workbook')
        await expect(parseWorkbook(bytes.buffer)).rejects.toThrow()
    })

    it('parses real XLSX bytes and files with ordered non-empty sheets and canonical CSV parity', async () => {
        const sheets = await parseWorkbook(await createCSVMappingWorkbookArrayBuffer())
        const [sites, deployments] = sheets

        expect(sheets.map(({ name }) => name)).toEqual(['Sites', 'Deployments'])
        expect(sites.text).toBe(csvMappingFixtureText)
        expect(sites.parsed.data).toEqual([
            {
                external_key: 'site-1',
                display_name: 'North, Bay',
                summary: 'Line "one", checked',
                owner_name: 'Ada',
                latitude: 44.25,
                parent_code: 'P-9',
                unused: 'discard-me',
            },
        ])
        expect(deployments.text).toContain('deploy-2,South Dock,Deployment row,Lin,12.5,P-2,second-only')
        await expect(parseWorkbookFile(await createCSVMappingWorkbookFile())).resolves.toEqual(sheets)

        const csvSource = createCSVMappingFixture(csvMappingFixtureText).source
        const workbookSource = createCSVMappingFixture(sites.text).source
        const loadRecords = async (adapter: typeof csvSource.adapter) => {
            const candidates = await adapter.discover({
                url: adapter.defaultImportUrl,
                signal: new AbortController().signal,
            })
            return Promise.all(candidates.map((candidate) => adapter.load({ candidate })))
        }

        await expect(loadRecords(workbookSource.adapter)).resolves.toEqual(
            await loadRecords(csvSource.adapter)
        )
        await expect(loadRecords(workbookSource.adapter)).resolves.toMatchObject([
            {
                label: 'North, Bay',
                slug: 'site-1',
                description: 'Line "one", checked',
                data: {
                    metadata: { name: 'North, Bay', summary: 'Line "one", checked', owner: { name: 'Ada' } },
                    locationDetail: {
                        type: 'stationary_marine',
                        deploymentLocation: { latitude: 44.25 },
                    },
                    parent_code: 'P-9',
                },
            },
        ])
    })
})

describe('convertWorkbookSheets', () => {
    it('returns each non-empty worksheet as an independent CSV source', () => {
        expect(
            convertWorkbookSheets([
                { sheet: 'Sites', data: [['site_name', 'depth'], ['North, Bay', 12]] },
                { sheet: 'Deployments', data: [['deployment'], ['A-1']] },
                { sheet: 'Empty', data: [] },
            ])
        ).toEqual([
            {
                name: 'Sites',
                text: 'site_name,depth\n"North, Bay",12',
                parsed: expect.objectContaining({
                    headers: expect.arrayContaining([
                        expect.objectContaining({ key: 'site_name' }),
                        expect.objectContaining({ key: 'depth' }),
                    ]),
                    data: [{ site_name: 'North, Bay', depth: 12 }],
                }),
            },
            {
                name: 'Deployments',
                text: 'deployment\nA-1',
                parsed: expect.objectContaining({
                    headers: [expect.objectContaining({ key: 'deployment' })],
                    data: [{ deployment: 'A-1' }],
                }),
            },
        ])
    })

    it('produces the same configured canonical records from CSV and converted worksheet data', async () => {
        const csvFixture = createCSVMappingFixture(csvMappingFixtureText)
        const [worksheet] = convertWorkbookSheets([
            {
                sheet: 'Sites',
                data: csvMappingFixtureWorksheetData,
            },
        ])
        const worksheetFixture = createCSVMappingFixture(worksheet.text)
        const loadRecords = async (adapter: typeof csvFixture.source.adapter) => {
            const candidates = await adapter.discover({
                url: adapter.defaultImportUrl,
                signal: new AbortController().signal,
            })
            return Promise.all(candidates.map((candidate) => adapter.load({ candidate })))
        }

        expect(worksheet.text).toBe(csvMappingFixtureText)
        await expect(loadRecords(worksheetFixture.source.adapter)).resolves.toEqual(
            await loadRecords(csvFixture.source.adapter)
        )
        await expect(loadRecords(csvFixture.source.adapter)).resolves.toMatchObject([
            {
                label: 'North, Bay',
                slug: 'site-1',
                description: 'Line "one", checked',
                data: {
                    metadata: { name: 'North, Bay', summary: 'Line "one", checked', owner: { name: 'Ada' } },
                    locationDetail: {
                        type: 'stationary_marine',
                        deploymentLocation: { latitude: 44.25 },
                    },
                    parent_code: 'P-9',
                },
            },
        ])
    })
})

describe('selectWorkbookSheets', () => {
    it('keeps only selected sheets in workbook order', () => {
        const sheets = convertWorkbookSheets([
            { sheet: 'Sites', data: [['site_name'], ['North']] },
            { sheet: 'Deployments', data: [['deployment'], ['A-1']] },
        ])

        expect(selectWorkbookSheets(sheets, new Set(['Deployments']))).toEqual([sheets[1]])
        expect(selectWorkbookSheets(sheets, new Set())).toEqual([])
        expect(selectWorkbookSheets(sheets, new Set(['Deployments', 'Sites']))).toEqual(sheets)
    })
})
