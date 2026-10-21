import type { CanonicalImportRecord } from './types'
import type { IDocument } from '@/types/types'
import { fetchDocuments } from '@/manage/document/services'
import { postToPostgrest } from '@/services/postgrest/services'
import { getImportSlugCandidates } from './reconciliation'

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
    objectTypeSlug,
    token,
    signal,
    batchSize = 100,
}: {
    records: CanonicalImportRecord[]
    objectTypeUuid: string
    objectTypeSlug: string
    token: string
    signal?: AbortSignal
    batchSize?: number
}): Promise<IDocument[]> => {
    const externalIds = Array.from(
        new Set(records.map((record) => record.provenance.externalId))
    )
    const slugs = Array.from(new Set(
        records.flatMap((record) => getImportSlugCandidates(record.slug, objectTypeSlug))
    ))
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

export const fetchDocumentsByDataFieldValues = async ({
    objectTypeUuid,
    fieldPath,
    values,
    token,
    signal,
    batchSize = 100,
}: {
    objectTypeUuid: string
    fieldPath: string
    values: string[]
    token: string
    signal?: AbortSignal
    batchSize?: number
}): Promise<IDocument[]> => {
    if (!/^[a-zA-Z0-9_.-]+$/.test(fieldPath)) {
        throw new Error(`Invalid document match field: ${fieldPath}`)
    }
    const path = fieldPath.split('.').filter(Boolean)
    if (path.length === 0) return []
    const isTopLevelField =
        fieldPath === 'uuid' || fieldPath === 'slug' || fieldPath === 'label'
    const column = isTopLevelField
        ? fieldPath
        : path.length === 1
            ? `data->>${path[0]}`
            : `data->${path.slice(0, -1).join('->')}->>${path[path.length - 1]}`
    const batches = chunk(Array.from(new Set(values)), batchSize)
    const results = await Promise.all(
        batches.map((batch) => fetchDocuments({
            token,
            signal,
            params: {
                filters: [
                    { column: 'object_type_uuid', operator: 'eq', value: objectTypeUuid },
                    { column, operator: 'in', value: batch },
                ],
            },
        }))
    )
    return Array.from(new Map(results.flat().map((document) => [document.uuid, document])).values())
}

export const fetchExistingDocumentBySlug = async ({
    slug,
    objectTypeUuid,
    objectTypeSlug,
    token,
    signal,
}: {
    slug: string
    objectTypeUuid: string
    objectTypeSlug: string
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
                { column: 'slug', operator: 'in', value: getImportSlugCandidates(slug, objectTypeSlug) },
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