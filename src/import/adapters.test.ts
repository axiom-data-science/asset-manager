import { describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***
import { createRemoteImportAdapter } from ***REMOVED***./adapters***REMOVED***

describe(***REMOVED***createRemoteImportAdapter***REMOVED***, () => {
    it(***REMOVED***adds stable source provenance during discovery***REMOVED***, async () => {
        const discover = vi.fn().mockResolvedValue([
            { uuid: ***REMOVED***remote-123***REMOVED***, slug: ***REMOVED***record-123***REMOVED***, label: ***REMOVED***Record***REMOVED***, data: { preview: true } },
        ])
        const adapter = createRemoteImportAdapter({
            id: ***REMOVED***example-source***REMOVED***,
            defaultImportUrl: ***REMOVED***https://example.test/records***REMOVED***,
            discover,
            load: vi.fn(),
        })
        const controller = new AbortController()

        const candidates = await adapter.discover({
            url: adapter.defaultImportUrl,
            signal: controller.signal,
        })

        expect(candidates[0].provenance).toEqual({
            sourceId: ***REMOVED***example-source***REMOVED***,
            externalId: ***REMOVED***remote-123***REMOVED***,
        })
        expect(discover).toHaveBeenCalledWith({
            url: ***REMOVED***https://example.test/records***REMOVED***,
            signal: controller.signal,
        })
    })

    it(***REMOVED***loads a canonical record without losing source identity or preview data***REMOVED***, async () => {
        const load = vi.fn().mockResolvedValue({
            slug: ***REMOVED***record-123***REMOVED***,
            label: ***REMOVED***Full record***REMOVED***,
            description: ***REMOVED***Loaded detail***REMOVED***,
            data: { complete: true },
            attrs: {},
        })
        const adapter = createRemoteImportAdapter({
            id: ***REMOVED***example-source***REMOVED***,
            defaultImportUrl: ***REMOVED***https://example.test/records***REMOVED***,
            defaultDetailRoot: ***REMOVED***https://example.test***REMOVED***,
            discover: vi.fn(),
            load,
        })
        const candidate = {
            uuid: ***REMOVED***remote-123***REMOVED***,
            slug: ***REMOVED***record-123***REMOVED***,
            label: ***REMOVED***Preview record***REMOVED***,
            data: { preview: true },
            provenance: { sourceId: ***REMOVED***example-source***REMOVED***, externalId: ***REMOVED***remote-123***REMOVED*** },
        }

        const record = await adapter.load({ candidate, detailRoot: adapter.defaultDetailRoot })

        expect(record).toMatchObject({
            uuid: ***REMOVED***remote-123***REMOVED***,
            slug: ***REMOVED***record-123***REMOVED***,
            label: ***REMOVED***Full record***REMOVED***,
            data: { complete: true },
            sourceData: { preview: true },
            provenance: candidate.provenance,
        })
        expect(load).toHaveBeenCalledWith({
            doc: candidate,
            serviceRoot: ***REMOVED***https://example.test***REMOVED***,
            signal: undefined,
        })
    })

    it(***REMOVED***allows a source to override its external identity field***REMOVED***, async () => {
        const adapter = createRemoteImportAdapter({
            id: ***REMOVED***example-source***REMOVED***,
            defaultImportUrl: ***REMOVED***https://example.test/records***REMOVED***,
            discover: vi.fn().mockResolvedValue([
                {
                    uuid: ***REMOVED***transport-id***REMOVED***,
                    slug: ***REMOVED***record***REMOVED***,
                    label: ***REMOVED***Record***REMOVED***,
                    data: { external_code: ***REMOVED***stable-456***REMOVED*** },
                },
            ]),
            load: vi.fn(),
            getExternalId: (candidate) =>
                String((candidate.data as { external_code: string }).external_code),
        })

        const candidates = await adapter.discover({
            url: adapter.defaultImportUrl,
            signal: new AbortController().signal,
        })

        expect(candidates[0].provenance.externalId).toBe(***REMOVED***stable-456***REMOVED***)
    })
})