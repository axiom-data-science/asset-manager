import type { CanonicalImportRecord } from ***REMOVED***./types***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import { fetchDocuments } from ***REMOVED***@/manage/document/services***REMOVED***
import { postToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***

const chunk = <T,>(items: T[], size: number): T[][] => {
    const batches: T[][] = []
    for (let index = 0; index < items.length; index += Math.max(1, size)) {
        batches.push(items.slice(index, index + Math.max(1, size)))
    }
    return batches
}

export const fetchExistingImportDocuments = async ({
    records,
    objectTypeUuid,
    token,
    signal,
    batchSize = 100,
}: {
    records: CanonicalImportRecord[]
    objectTypeUuid: string
    token: string
    signal?: AbortSignal
    batchSize?: number
}): Promise<IDocument[]> => {
    const externalIds = Array.from(
        new Set(records.map((record) => record.provenance.externalId))
    )
    const slugs = Array.from(new Set(records.map((record) => record.slug)))
    const results = await Promise.all([
        ...chunk(externalIds, batchSize).map((ids) =>
            fetchDocuments({
                token,
                signal,
                params: {
                    filters: [
                        { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: objectTypeUuid },
                        { column: ***REMOVED***attrs->import->>external_id***REMOVED***, operator: ***REMOVED***in***REMOVED***, value: ids },
                    ],
                },
            })
        ),
        ...chunk(slugs, batchSize).map((slugBatch) =>
            fetchDocuments({
                token,
                signal,
                params: {
                    filters: [
                        { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: objectTypeUuid },
                        { column: ***REMOVED***slug***REMOVED***, operator: ***REMOVED***in***REMOVED***, value: slugBatch },
                    ],
                },
            })
        ),
    ])
    return Array.from(
        new Map(results.flat().map((document) => [document.uuid, document])).values()
    )
}

export const fetchExistingDocumentBySlug = async ({
    slug,
    objectTypeUuid,
    token,
    signal,
}: {
    slug: string
    objectTypeUuid: string
    token: string
    signal?: AbortSignal
}): Promise<IDocument | undefined> => {
    const documents = await fetchDocuments({
        token,
        signal,
        params: {
            limit: 1,
            filters: [
                { column: ***REMOVED***object_type_uuid***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: objectTypeUuid },
                { column: ***REMOVED***slug***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: slug },
            ],
        },
    })
    return documents[0]
}

export const mergeImportDocumentViaRpc = async ({
    rpcPath,
    documentUuid,
    incomingDocument,
    token,
    signal,
}: {
    rpcPath: string
    documentUuid: string
    incomingDocument: Partial<IDocument>
    token: string
    signal?: AbortSignal
}): Promise<IDocument> => {
    if (!rpcPath.trim()) throw new Error(***REMOVED***Import merge RPC is not configured***REMOVED***)
    const normalizedPath = rpcPath.replace(/^\/+/, ***REMOVED******REMOVED***)
    return postToPostgrest<
        { document_uuid: string; incoming_document: Partial<IDocument> },
        IDocument
    >({
        table: normalizedPath.startsWith(***REMOVED***rpc/***REMOVED***) ? normalizedPath : `rpc/${normalizedPath}`,
        token,
        signal,
        body: {
            document_uuid: documentUuid,
            incoming_document: incomingDocument,
        },
    })
}