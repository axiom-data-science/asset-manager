import { describe, expect, it, vi } from 'vitest'
import { createRemoteImportAdapter } from './adapters'

describe('createRemoteImportAdapter', () => {
    it('adds stable source provenance during discovery', async () => {
        const discover = vi.fn().mockResolvedValue([
            { uuid: 'remote-123', slug: 'record-123', label: 'Record', data: { preview: true } },
        ])
        const adapter = createRemoteImportAdapter({
            id: 'example-source',
            defaultImportUrl: 'https://example.test/records',
            discover,
            load: vi.fn(),
        })
        const controller = new AbortController()

        const candidates = await adapter.discover({
            url: adapter.defaultImportUrl,
            signal: controller.signal,
        })

        expect(candidates[0].provenance).toEqual({
            sourceId: 'example-source',
            externalId: 'remote-123',
        })
        expect(discover).toHaveBeenCalledWith({
            url: 'https://example.test/records',
            signal: controller.signal,
        })
    })

    it('loads a canonical record without losing source identity or preview data', async () => {
        const load = vi.fn().mockResolvedValue({
            slug: 'record-123',
            label: 'Full record',
            description: 'Loaded detail',
            data: { complete: true },
            attrs: {},
        })
        const adapter = createRemoteImportAdapter({
            id: 'example-source',
            defaultImportUrl: 'https://example.test/records',
            defaultDetailRoot: 'https://example.test',
            discover: vi.fn(),
            load,
        })
        const candidate = {
            uuid: 'remote-123',
            slug: 'record-123',
            label: 'Preview record',
            data: { preview: true },
            provenance: { sourceId: 'example-source', externalId: 'remote-123' },
        }

        const record = await adapter.load({ candidate, detailRoot: adapter.defaultDetailRoot })

        expect(record).toMatchObject({
            uuid: 'remote-123',
            slug: 'record-123',
            label: 'Full record',
            data: { complete: true },
            sourceData: { preview: true },
            provenance: candidate.provenance,
        })
        expect(load).toHaveBeenCalledWith({
            doc: candidate,
            serviceRoot: 'https://example.test',
            signal: undefined,
        })
    })

    it('allows a source to override its external identity field', async () => {
        const adapter = createRemoteImportAdapter({
            id: 'example-source',
            defaultImportUrl: 'https://example.test/records',
            discover: vi.fn().mockResolvedValue([
                {
                    uuid: 'transport-id',
                    slug: 'record',
                    label: 'Record',
                    data: { external_code: 'stable-456' },
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

        expect(candidates[0].provenance.externalId).toBe('stable-456')
    })
})