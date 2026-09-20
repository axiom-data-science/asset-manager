export type ImportErrorKind =
    | 'duplicate-type-slug'
    | 'forbidden'
    | 'validation'
    | 'network'
    | 'unknown'

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
        /duplicate key value violates unique constraint\s+["']?document_type_slug_uniq["']?/i.test(message)
    ) {
        return {
            kind: 'duplicate-type-slug',
            status,
            constraint: 'document_type_slug_uniq',
            message:
                'A document with this type and identifier already exists, but it was not available during duplicate checking. It may be hidden by permissions or was created after the check.',
        }
    }

    if (status === 401 || status === 403) {
        return {
            kind: 'forbidden',
            status,
            message: 'You do not have permission to create or update this document.',
        }
    }

    if (status === 400 || status === 422) {
        return {
            kind: 'validation',
            status,
            message: 'PostgREST rejected the document data. Review its validation details and fields.',
        }
    }

    if (/failed to fetch|networkerror|network request failed/i.test(message)) {
        return {
            kind: 'network',
            message: 'The document could not be saved because the server could not be reached.',
        }
    }

    return { kind: 'unknown', status, message }
}