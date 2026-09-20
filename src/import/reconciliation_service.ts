import type { CanonicalImportRecord } from './types'
import type { IDocument } from '@/types/types'
import { fetchDocuments } from '@/manage/document/services'
import { postToPostgrest } from '@/services/postgrest/services'

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
                        { column: 'object_type_uuid', operator: 'eq', value: objectTypeUuid },
                        { column: 'attrs->import->>external_id', operator: 'in', value: ids },
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
                        { column: 'object_type_uuid', operator: 'eq', value: objectTypeUuid },
                        { column: 'slug', operator: 'in', value: slugBatch },
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
                { column: 'object_type_uuid', operator: 'eq', value: objectTypeUuid },
                { column: 'slug', operator: 'eq', value: slug },
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
    if (!rpcPath.trim()) throw new Error('Import merge RPC is not configured')
    const normalizedPath = rpcPath.replace(/^\/+/, '')
    return postToPostgrest<
        { document_uuid: string; incoming_document: Partial<IDocument> },
        IDocument
    >({
        table: normalizedPath.startsWith('rpc/') ? normalizedPath : `rpc/${normalizedPath}`,
        token,
        signal,
        body: {
            document_uuid: documentUuid,
            incoming_document: incomingDocument,
        },
    })
}