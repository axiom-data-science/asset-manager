export type ImportErrorKind =
    | ***REMOVED***duplicate-type-slug***REMOVED***
    | ***REMOVED***forbidden***REMOVED***
    | ***REMOVED***validation***REMOVED***
    | ***REMOVED***network***REMOVED***
    | ***REMOVED***unknown***REMOVED***

export type ImportErrorDetails = {
    kind: ImportErrorKind
    message: string
    constraint?: string
    status?: number
}

const errorText = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

export const classifyImportError = (error: unknown): ImportErrorDetails => {
    const message = errorText(error)
    const statusMatch = message.match(/status:\s*(\d{3})/i)
    const status = statusMatch ? Number(statusMatch[1]) : undefined

    if (
        status === 409 &&
        /duplicate key value violates unique constraint\s+["***REMOVED***]?document_type_slug_uniq["***REMOVED***]?/i.test(message)
    ) {
        return {
            kind: ***REMOVED***duplicate-type-slug***REMOVED***,
            status,
            constraint: ***REMOVED***document_type_slug_uniq***REMOVED***,
            message:
                ***REMOVED***A document with this type and identifier already exists, but it was not available during duplicate checking. It may be hidden by permissions or was created after the check.***REMOVED***,
        }
    }

    if (status === 401 || status === 403) {
        return {
            kind: ***REMOVED***forbidden***REMOVED***,
            status,
            message: ***REMOVED***You do not have permission to create or update this document.***REMOVED***,
        }
    }

    if (status === 400 || status === 422) {
        return {
            kind: ***REMOVED***validation***REMOVED***,
            status,
            message: ***REMOVED***PostgREST rejected the document data. Review its validation details and fields.***REMOVED***,
        }
    }

    if (/failed to fetch|networkerror|network request failed/i.test(message)) {
        return {
            kind: ***REMOVED***network***REMOVED***,
            message: ***REMOVED***The document could not be saved because the server could not be reached.***REMOVED***,
        }
    }

    return { kind: ***REMOVED***unknown***REMOVED***, status, message }
}