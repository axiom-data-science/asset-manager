import type { CanonicalImportRecord, ImportProvenance } from './types'
import type { IDocument } from '@/types/types'
import { isEqual } from 'lodash-es'

export type ImportConflictAction = 'create' | 'ignore' | 'overwrite' | 'merge'
export type ImportMatchStatus = 'new' | 'exact' | 'conflicting' | 'ambiguous'
export type ImportMergeStrategy = 'client-patch' | 'postgrest-rpc'

export type ImportDocumentProvenance = {
    source_id: string
    external_id: string
}

export type ImportReconciliation = {
    record: CanonicalImportRecord
    status: ImportMatchStatus
    action?: ImportConflictAction
    existingDocuments: IDocument[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)

const isEmptyIncomingValue = (value: unknown): boolean =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (isPlainObject(value) && Object.keys(value).length === 0)

export const mergeIncomingNonEmpty = (existing: unknown, incoming: unknown): unknown => {
    if (isEmptyIncomingValue(incoming) && existing !== undefined) return existing
    if (!isPlainObject(existing) || !isPlainObject(incoming)) return incoming

    const merged: Record<string, unknown> = { ...existing }
    for (const [key, incomingValue] of Object.entries(incoming)) {
        merged[key] = mergeIncomingNonEmpty(existing[key], incomingValue)
    }
    return merged
}

export const getDocumentImportProvenance = (
    document: Pick<IDocument, 'attrs'>
): ImportDocumentProvenance | undefined => {
    if (!isPlainObject(document.attrs)) return undefined
    const provenance = document.attrs.import
    if (!isPlainObject(provenance)) return undefined
    if (typeof provenance.external_id !== 'string' || typeof provenance.source_id !== 'string') {
        return undefined
    }
    return {
        source_id: provenance.source_id,
        external_id: provenance.external_id,
    }
}

export const withImportProvenance = (
    attrs: unknown,
    provenance: ImportProvenance
): Record<string, unknown> => ({
    ...(isPlainObject(attrs) ? attrs : {}),
    import: {
        source_id: provenance.sourceId,
        external_id: provenance.externalId,
    },
})

const recordMatchesDocument = (
    record: CanonicalImportRecord,
    document: IDocument
): boolean =>
    record.slug === document.slug &&
    record.label === document.label &&
    (record.description ?? '') === (document.description ?? '') &&
    isEqual(record.data, document.data)

export const reconcileImportRecords = (
    records: CanonicalImportRecord[],
    existingDocuments: IDocument[]
): ImportReconciliation[] => {
    const documentsByExternalId = new Map<string, IDocument[]>()
    const documentsBySlug = new Map<string, IDocument[]>()
    for (const document of existingDocuments) {
        const provenance = getDocumentImportProvenance(document)
        if (provenance) {
            const matches = documentsByExternalId.get(provenance.external_id) ?? []
            matches.push(document)
            documentsByExternalId.set(provenance.external_id, matches)
        }
        const slugMatches = documentsBySlug.get(document.slug) ?? []
        slugMatches.push(document)
        documentsBySlug.set(document.slug, slugMatches)
    }

    const incomingSlugCounts = records.reduce<Map<string, number>>((counts, record) => {
        counts.set(record.slug, (counts.get(record.slug) ?? 0) + 1)
        return counts
    }, new Map())

    return records.map((record) => {
        const matches = Array.from(new Map(
            [
                ...(documentsByExternalId.get(record.provenance.externalId) ?? []),
                ...(documentsBySlug.get(record.slug) ?? []),
            ].map((document) => [document.uuid, document])
        ).values())
        if ((incomingSlugCounts.get(record.slug) ?? 0) > 1) {
            return { record, status: 'ambiguous', existingDocuments: matches }
        }
        if (matches.length === 0) {
            return { record, status: 'new', action: 'create', existingDocuments: [] }
        }
        if (matches.length > 1) {
            return { record, status: 'ambiguous', existingDocuments: matches }
        }
        if (recordMatchesDocument(record, matches[0])) {
            return { record, status: 'exact', action: 'ignore', existingDocuments: matches }
        }
        return { record, status: 'conflicting', action: 'ignore', existingDocuments: matches }
    })
}