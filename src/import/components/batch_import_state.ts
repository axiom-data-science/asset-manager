import type { ImportCandidate } from ***REMOVED***@/import/types***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import { classifyImportError, type ImportErrorKind } from ***REMOVED***@/import/import_errors***REMOVED***

export type ImportRowState = ImportCandidate<unknown> & {
    selected: boolean
    imported: boolean
    loading: boolean
    error?: string
    errorKind?: ImportErrorKind
    savedDocument?: IDocument
}

export const createImportRows = (documents: ImportCandidate<unknown>[]): ImportRowState[] =>
    documents.map((document) => ({
        ...document,
        selected: true,
        imported: false,
        loading: false,
    }))

export const importCandidateListKey = (documents: ImportCandidate<unknown>[]): string =>
    documents
        .map((document) =>
            `${document.provenance.sourceId}:${document.provenance.externalId}:${document.uuid}`
        )
        .join(***REMOVED***|***REMOVED***)

export const applyBatchResults = (
    rows: ImportRowState[],
    batch: ImportRowState[],
    results: PromiseSettledResult<void>[]
): ImportRowState[] => {
    const resultsById = new Map(batch.map((row, index) => [row.uuid, results[index]]))

    return rows.map((row) => {
        const result = resultsById.get(row.uuid)
        if (!result) return row
        if (result.status === ***REMOVED***fulfilled***REMOVED***) {
            return {
                ...row,
                imported: true,
                selected: false,
                loading: false,
                error: undefined,
                errorKind: undefined,
            }
        }
        const error = classifyImportError(result.reason)
        return {
            ...row,
            imported: false,
            loading: false,
            error: error.message,
            errorKind: error.kind,
        }
    })
}