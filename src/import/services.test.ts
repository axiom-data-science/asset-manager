import { describe, expect, it, vi } from 'vitest'

vi.mock('@axdspub/axiom-ui-data-services', () => ({
    oikos: {
        services: {
            fetchLayer: vi.fn().mockResolvedValue({
                label: 'Layer 42',
                description: 'A vector layer',
            }),
        },
    },
}))

import { oikosLayer, oikosVectorLayers } from './services'

describe('Oikos vector layer imports', () => {
    it('preserves the containing layer group identity during discovery and loading', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockResolvedValueOnce({
                    json: async () => ({
                        results: [
                            {
                                id: 'group-17',
                                uuid: 'group-uuid',
                                label: 'Group 17',
                                source: {
                                    layers: [{ type: 'VECTOR', id: 42, uuid: 'layer-uuid', label: 'Layer 42' }],
                                },
                            },
                        ],
                    }),
                })
        )

        const candidates = await oikosVectorLayers({ url: 'https://example.test/search' })
        const record = await oikosLayer({ doc: candidates[0], serviceRoot: 'https://example.test' })

        expect(candidates[0].data).toMatchObject({ id: 42, layer_group_id: 'group-17' })
        expect(record.data).toMatchObject({ label: 'Layer 42', layer_group_id: 'group-17' })
    })
})