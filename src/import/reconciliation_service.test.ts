import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDocuments } from '@/manage/document/services'
import { postToPostgrest } from '@/services/postgrest/services'
import {
    fetchExistingDocumentBySlug,
    fetchExistingImportDocuments,
    mergeImportDocumentViaRpc,
} from './reconciliation_service'
import type { CanonicalImportRecord } from './types'

vi.mock('@/manage/document/services', () => ({
    fetchDocuments: vi.fn(),
}))
vi.mock('@/services/postgrest/services', () => ({
    postToPostgrest: vi.fn(),
}))

const records = ['one', 'two', 'three'].map((externalId) => ({
    uuid: externalId,
    slug: externalId,
    label: externalId,
    description: '',
    data: {},
    attrs: {},
    sourceData: {},
    provenance: { sourceId: 'source-a', externalId },
})) satisfies CanonicalImportRecord[]

describe('fetchExistingImportDocuments', () => {
    beforeEach(() => vi.mocked(fetchDocuments).mockReset())

    it('queries external IDs in batches within the selected object type', async () => {
        vi.mocked(fetchDocuments)
            .mockResolvedValueOnce([{ uuid: 'existing-one' }] as never)
            .mockResolvedValueOnce([{ uuid: 'existing-three' }] as never)
            .mockResolvedValueOnce([{ uuid: 'existing-one' }] as never)
            .mockResolvedValueOnce([])

        const result = await fetchExistingImportDocuments({
            records,
            objectTypeUuid: 'type-1',
            token: 'token',
            batchSize: 2,
        })

        expect(fetchDocuments).toHaveBeenCalledTimes(4)
        expect(fetchDocuments).toHaveBeenNthCalledWith(1, expect.objectContaining({
            token: 'token',
            params: {
                filters: [
                    { column: 'object_type_uuid', operator: 'eq', value: 'type-1' },
                    { column: 'attrs->import->>external_id', operator: 'in', value: ['one', 'two'] },
                ],
            },
        }))
        expect(fetchDocuments).toHaveBeenNthCalledWith(3, expect.objectContaining({
            token: 'token',
            params: {
                filters: [
                    { column: 'object_type_uuid', operator: 'eq', value: 'type-1' },
                    { column: 'slug', operator: 'in', value: ['one', 'two'] },
                ],
            },
        }))
        expect(result).toHaveLength(2)
    })
})

describe('mergeImportDocumentViaRpc', () => {
    it('posts the documented merge contract to the configured RPC', async () => {
        const updated = { uuid: 'document-1', label: 'Merged' }
        vi.mocked(postToPostgrest).mockResolvedValue(updated as never)

        const result = await mergeImportDocumentViaRpc({
            rpcPath: 'merge_import_document',
            documentUuid: 'document-1',
            incomingDocument: { label: 'Incoming', data: { value: 2 } },
            token: 'token',
        })

        expect(postToPostgrest).toHaveBeenCalledWith({
            table: 'rpc/merge_import_document',
            token: 'token',
            signal: undefined,
            body: {
                document_uuid: 'document-1',
                incoming_document: { label: 'Incoming', data: { value: 2 } },
            },
        })
        expect(result).toBe(updated)
    })

    it('fails before making a request when the RPC is not configured', async () => {
        await expect(mergeImportDocumentViaRpc({
            rpcPath: '',
            documentUuid: 'document-1',
            incomingDocument: {},
            token: 'token',
        })).rejects.toThrow('Import merge RPC is not configured')

        expect(postToPostgrest).not.toHaveBeenCalled()
    })
})

describe('fetchExistingDocumentBySlug', () => {
    it('checks the database uniqueness key immediately before create', async () => {
        const existing = { uuid: 'existing-one', slug: 'one' }
        vi.mocked(fetchDocuments).mockResolvedValue([existing] as never)

        const result = await fetchExistingDocumentBySlug({
            slug: 'one',
            objectTypeUuid: 'type-1',
            token: 'token',
        })

        expect(fetchDocuments).toHaveBeenCalledWith({
            token: 'token',
            signal: undefined,
            params: {
                limit: 1,
                filters: [
                    { column: 'object_type_uuid', operator: 'eq', value: 'type-1' },
                    { column: 'slug', operator: 'eq', value: 'one' },
                ],
            },
        })
        expect(result).toBe(existing)
    })
})