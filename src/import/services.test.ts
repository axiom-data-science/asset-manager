import { describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***

vi.mock(***REMOVED***@axdspub/axiom-ui-data-services***REMOVED***, () => ({
    oikos: {
        services: {
            fetchLayer: vi.fn().mockResolvedValue({
                label: ***REMOVED***Layer 42***REMOVED***,
                description: ***REMOVED***A vector layer***REMOVED***,
            }),
        },
    },
}))

import { oikosLayer, oikosVectorLayers } from ***REMOVED***./services***REMOVED***

describe(***REMOVED***Oikos vector layer imports***REMOVED***, () => {
    it(***REMOVED***preserves the containing layer group identity during discovery and loading***REMOVED***, async () => {
        vi.stubGlobal(
            ***REMOVED***fetch***REMOVED***,
            vi.fn()
                .mockResolvedValueOnce({
                    json: async () => ({
                        results: [
                            {
                                id: ***REMOVED***group-17***REMOVED***,
                                uuid: ***REMOVED***group-uuid***REMOVED***,
                                label: ***REMOVED***Group 17***REMOVED***,
                                source: {
                                    layers: [{ type: ***REMOVED***VECTOR***REMOVED***, id: 42, uuid: ***REMOVED***layer-uuid***REMOVED***, label: ***REMOVED***Layer 42***REMOVED*** }],
                                },
                            },
                        ],
                    }),
                })
        )

        const candidates = await oikosVectorLayers({ url: ***REMOVED***https://example.test/search***REMOVED*** })
        const record = await oikosLayer({ doc: candidates[0], serviceRoot: ***REMOVED***https://example.test***REMOVED*** })

        expect(candidates[0].data).toMatchObject({ id: 42, layerGroupId: ***REMOVED***group-17***REMOVED*** })
        expect(record.data).toMatchObject({ label: ***REMOVED***Layer 42***REMOVED***, layerGroupId: ***REMOVED***group-17***REMOVED*** })
    })
})