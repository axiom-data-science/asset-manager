import { describe, expect, it } from 'vitest'
import { convertWorkbookSheets } from './workbook'

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
})
