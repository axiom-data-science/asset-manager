import { beforeEach, describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***
import { fetchDocuments } from ***REMOVED***@/manage/document/services***REMOVED***
import { postToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import {
    fetchExistingDocumentBySlug,
    fetchExistingImportDocuments,
    mergeImportDocumentViaRpc,
} from ***REMOVED***./reconciliation_service***REMOVED***
import type { CanonicalImportRecord } from ***REMOVED***./types***REMOVED***

vi.mock(***REMOVED***@/manage/document/services***REMOVED***, () => ({
    fetchDocuments: vi.fn(),
}))
vi.mock(***REMOVED***@/services/postgrest/services***REMOVED***, () => ({
    postToPostgrest: vi.fn(),
}))

const records = [***REMOVED***one***REMOVED***, ***REMOVED***two***REMOVED***, ***REMOVED***three***REMOVED***].map((externalId) => ({
    uuid: externalId,
    slug: externalId,
    label: externalId,
    description: ***REMOVED******REMOVED***,
    data: {},
    attrs: {},
    sourceData: {},
    provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId },
})) satisfies CanonicalImportRecord[]

describe(***REMOVED***fetchExistingImportDocuments***REMOVED***, () => {
    beforeEach(() => vi.mocked(fetchDocuments).mockReset())

    it(***REMOVED***queries external IDs in batches within the selected object type***REMOVED***, async () => {
        vi.mocked(fetchDocuments)
            .mockResolvedValueOnce([{ uuid: ***REMOVED***existing-one***REMOVED*** }] as never)
            .mockResolvedValueOnce([{ uuid: ***REMOVED***existing-three***REMOVED*** }] as never)
            .mockResolvedValueOnce([{ uuid: ***REMOVED***existing-one***REMOVED*** }] as never)
            .mockResolvedValueOnce([])

        const result = await fetchExistingImportDocuments({
            records,
            objectTypeUuid: ***REMOVED***type-1***REMOVED***,
            token: ***REMOVED***token***REMOVED***,
            batchSize: 2,
        })

        expect(fetchDocuments).toHaveBeenCalledTimes(4)
        expect(fetchDocuments).toHaveBeenNthCalledWith(1, expect.objectContaining({
            token: ***REMOVED***token***REMOVED***,
            params: {
                filters: [
                    { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: ***REMOVED***type-1***REMOVED*** },
                    { column: ***REMOVED***attrs->import->>external_id***REMOVED***, operator: ***REMOVED***in***REMOVED***, value: [***REMOVED***one***REMOVED***, ***REMOVED***two***REMOVED***] },
                ],
            },
        }))
        expect(fetchDocuments).toHaveBeenNthCalledWith(3, expect.objectContaining({
            token: ***REMOVED***token***REMOVED***,
            params: {
                filters: [
                    { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: ***REMOVED***type-1***REMOVED*** },
                    { column: ***REMOVED***slug***REMOVED***, operator: ***REMOVED***in***REMOVED***, value: [***REMOVED***one***REMOVED***, ***REMOVED***two***REMOVED***] },
                ],
            },
        }))
        expect(result).toHaveLength(2)
    })
})

describe(***REMOVED***mergeImportDocumentViaRpc***REMOVED***, () => {
    it(***REMOVED***posts the documented merge contract to the configured RPC***REMOVED***, async () => {
        const updated = { uuid: ***REMOVED***document-1***REMOVED***, label: ***REMOVED***Merged***REMOVED*** }
        vi.mocked(postToPostgrest).mockResolvedValue(updated as never)

        const result = await mergeImportDocumentViaRpc({
            rpcPath: ***REMOVED***merge_import_document***REMOVED***,
            documentUuid: ***REMOVED***document-1***REMOVED***,
            incomingDocument: { label: ***REMOVED***Incoming***REMOVED***, data: { value: 2 } },
            token: ***REMOVED***token***REMOVED***,
        })

        expect(postToPostgrest).toHaveBeenCalledWith({
            table: ***REMOVED***rpc/merge_import_document***REMOVED***,
            token: ***REMOVED***token***REMOVED***,
            signal: undefined,
            body: {
                document_uuid: ***REMOVED***document-1***REMOVED***,
                incoming_document: { label: ***REMOVED***Incoming***REMOVED***, data: { value: 2 } },
            },
        })
        expect(result).toBe(updated)
    })

    it(***REMOVED***fails before making a request when the RPC is not configured***REMOVED***, async () => {
        await expect(mergeImportDocumentViaRpc({
            rpcPath: ***REMOVED******REMOVED***,
            documentUuid: ***REMOVED***document-1***REMOVED***,
            incomingDocument: {},
            token: ***REMOVED***token***REMOVED***,
        })).rejects.toThrow(***REMOVED***Import merge RPC is not configured***REMOVED***)

        expect(postToPostgrest).not.toHaveBeenCalled()
    })
})

describe(***REMOVED***fetchExistingDocumentBySlug***REMOVED***, () => {
    it(***REMOVED***checks the database uniqueness key immediately before create***REMOVED***, async () => {
        const existing = { uuid: ***REMOVED***existing-one***REMOVED***, slug: ***REMOVED***one***REMOVED*** }
        vi.mocked(fetchDocuments).mockResolvedValue([existing] as never)

        const result = await fetchExistingDocumentBySlug({
            slug: ***REMOVED***one***REMOVED***,
            objectTypeUuid: ***REMOVED***type-1***REMOVED***,
            token: ***REMOVED***token***REMOVED***,
        })

        expect(fetchDocuments).toHaveBeenCalledWith({
            token: ***REMOVED***token***REMOVED***,
            signal: undefined,
            params: {
                limit: 1,
                filters: [
                    { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: ***REMOVED***type-1***REMOVED*** },
                    { column: ***REMOVED***slug***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: ***REMOVED***one***REMOVED*** },
                ],
            },
        })
        expect(result).toBe(existing)
    })
})