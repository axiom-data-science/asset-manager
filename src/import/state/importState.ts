import type { CanonicalImportRecord, ImportCandidate } from ***REMOVED***@/import/types***REMOVED***
import type {
    ImportConflictAction,
    ImportMergeStrategy,
    ImportReconciliation,
} from ***REMOVED***@/import/reconciliation***REMOVED***
import type { IObjectType } from ***REMOVED***@/types/types***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import type { ImportErrorKind } from ***REMOVED***@/import/import_errors***REMOVED***
import { atom, useAtom } from ***REMOVED***jotai***REMOVED***
import { useCallback } from ***REMOVED***react***REMOVED***

export type ImportRecordStage =
    | ***REMOVED***discovered***REMOVED***
    | ***REMOVED***loaded***REMOVED***
    | ***REMOVED***validated***REMOVED***
    | ***REMOVED***reconciled***REMOVED***
    | ***REMOVED***ready***REMOVED***
    | ***REMOVED***imported***REMOVED***
    | ***REMOVED***related***REMOVED***
    | ***REMOVED***failed***REMOVED***

export type ImportRecordResult = {
    stage: ImportRecordStage
    error?: string
    errorKind?: ImportErrorKind
}

export type ImportValidationResult = {
    isValid: boolean
    errors: string[]
}

export type ImportSession = {
    sourceId: string
    candidates: ImportCandidate[]
    records: CanonicalImportRecord[]
    selectedObjectType?: IObjectType
    schema: JSONSchema6 | null
    validationResults: Record<string, ImportValidationResult>
    includeInvalidRecords: boolean
    mergeStrategy: ImportMergeStrategy
    reconciliations: ImportReconciliation[] | null
    recordResults: Record<string, ImportRecordResult>
}

export const importRecordKey = ({ provenance }: ImportCandidate): string =>
    `${provenance.sourceId}:${provenance.externalId}`

export const createImportSession = (sourceId: string): ImportSession => ({
    sourceId,
    candidates: [],
    records: [],
    schema: null,
    validationResults: {},
    includeInvalidRecords: false,
    mergeStrategy: ***REMOVED***client-patch***REMOVED***,
    reconciliations: null,
    recordResults: {},
})

export const setDiscoveredCandidates = (
    session: ImportSession,
    candidates: ImportCandidate[]
): ImportSession => ({
    ...createImportSession(session.sourceId),
    candidates,
    recordResults: Object.fromEntries(
        candidates.map((candidate) => [importRecordKey(candidate), { stage: ***REMOVED***discovered***REMOVED*** }])
    ),
})

export const setLoadedRecords = (
    session: ImportSession,
    records: CanonicalImportRecord[]
): ImportSession => ({
    ...session,
    records,
    reconciliations: null,
    recordResults: {
        ...session.recordResults,
        ...Object.fromEntries(
            records.map((record) => [importRecordKey(record), { stage: ***REMOVED***loaded***REMOVED*** }])
        ),
    },
})

export const setImportRecordResult = (
    session: ImportSession,
    record: ImportCandidate,
    result: ImportRecordResult
): ImportSession => ({
    ...session,
    recordResults: {
        ...session.recordResults,
        [importRecordKey(record)]: result,
    },
})

export const setImportSchema = (
    session: ImportSession,
    schema: JSONSchema6 | null
): ImportSession => ({
    ...session,
    schema,
    validationResults: {},
    includeInvalidRecords: false,
    reconciliations: null,
    recordResults: Object.fromEntries(
        Object.entries(session.recordResults).map(([key, result]) => [
            key,
            result.stage === ***REMOVED***validated***REMOVED*** ? { stage: ***REMOVED***loaded***REMOVED*** } : result,
        ])
    ),
})

export const setImportValidationResults = (
    session: ImportSession,
    results: Array<{ record: CanonicalImportRecord; result: ImportValidationResult }>
): ImportSession => ({
    ...session,
    reconciliations: null,
    validationResults: Object.fromEntries(
        results.map(({ record, result }) => [importRecordKey(record), result])
    ),
    recordResults: {
        ...session.recordResults,
        ...Object.fromEntries(
            results.map(({ record }) => [importRecordKey(record), { stage: ***REMOVED***validated***REMOVED*** }])
        ),
    },
})

export const filterImportEligibleRecords = (
    records: CanonicalImportRecord[],
    validationResults: Record<string, ImportValidationResult>,
    includeInvalidRecords: boolean
): CanonicalImportRecord[] =>
    records.filter((record) => {
        const validation = validationResults[importRecordKey(record)]
        return validation?.isValid || (includeInvalidRecords && validation !== undefined)
    })

export const getImportEligibleRecords = (session: ImportSession): CanonicalImportRecord[] =>
    filterImportEligibleRecords(
        session.records,
        session.validationResults,
        session.includeInvalidRecords
    )

export const isValidationComplete = (session: ImportSession): boolean =>
    session.records.length > 0 &&
    session.records.every((record) => session.validationResults[importRecordKey(record)] !== undefined)

export const setImportReconciliations = (
    session: ImportSession,
    reconciliations: ImportReconciliation[]
): ImportSession => ({
    ...session,
    reconciliations,
    recordResults: {
        ...session.recordResults,
        ...Object.fromEntries(
            reconciliations.map(({ record }) => [importRecordKey(record), { stage: ***REMOVED***reconciled***REMOVED*** }])
        ),
    },
})

export const setImportConflictAction = (
    session: ImportSession,
    record: ImportCandidate,
    action: ImportConflictAction
): ImportSession => ({
    ...session,
    reconciliations: session.reconciliations?.map((reconciliation) =>
        importRecordKey(reconciliation.record) === importRecordKey(record)
            ? { ...reconciliation, action }
            : reconciliation
    ) ?? null,
})

const importSessionsState = atom<Record<string, ImportSession>>({})

export const useImportSession = (sourceId: string) => {
    const [sessions, setSessions] = useAtom(importSessionsState)
    const session = sessions[sourceId] ?? createImportSession(sourceId)

    const updateSession = useCallback(
        (update: (current: ImportSession) => ImportSession) => {
            setSessions((current) => ({
                ...current,
                [sourceId]: update(current[sourceId] ?? createImportSession(sourceId)),
            }))
        },
        [setSessions, sourceId]
    )

    const resetSession = useCallback(() => {
        updateSession(() => createImportSession(sourceId))
    }, [sourceId, updateSession])

    const setCandidates = useCallback(
        (candidates: ImportCandidate[]) => {
            updateSession((current) => setDiscoveredCandidates(current, candidates))
        },
        [updateSession]
    )

    const setRecords = useCallback(
        (records: CanonicalImportRecord[]) => {
            updateSession((current) => setLoadedRecords(current, records))
        },
        [updateSession]
    )

    const setSelectedObjectType = useCallback(
        (selectedObjectType: IObjectType | undefined) => {
            updateSession((current) => ({
                ...current,
                selectedObjectType,
                reconciliations: null,
            }))
        },
        [updateSession]
    )

    const setSchema = useCallback(
        (schema: JSONSchema6 | null) => {
            updateSession((current) => setImportSchema(current, schema))
        },
        [updateSession]
    )

    const setValidationResults = useCallback(
        (results: Array<{ record: CanonicalImportRecord; result: ImportValidationResult }>) => {
            updateSession((current) => setImportValidationResults(current, results))
        },
        [updateSession]
    )

    const setIncludeInvalidRecords = useCallback(
        (includeInvalidRecords: boolean) => {
            updateSession((current) => ({
                ...current,
                includeInvalidRecords,
                reconciliations: null,
            }))
        },
        [updateSession]
    )

    const setMergeStrategy = useCallback(
        (mergeStrategy: ImportMergeStrategy) => {
            updateSession((current) => ({ ...current, mergeStrategy }))
        },
        [updateSession]
    )

    const setRecordResult = useCallback(
        (record: ImportCandidate, result: ImportRecordResult) => {
            updateSession((current) => setImportRecordResult(current, record, result))
        },
        [updateSession]
    )

    const setReconciliations = useCallback(
        (reconciliations: ImportReconciliation[]) => {
            updateSession((current) => setImportReconciliations(current, reconciliations))
        },
        [updateSession]
    )

    const clearReconciliations = useCallback(() => {
        updateSession((current) => ({ ...current, reconciliations: null }))
    }, [updateSession])

    const setConflictAction = useCallback(
        (record: ImportCandidate, action: ImportConflictAction) => {
            updateSession((current) => setImportConflictAction(current, record, action))
        },
        [updateSession]
    )

    return {
        session,
        resetSession,
        setCandidates,
        setRecords,
        setSelectedObjectType,
        setSchema,
        setValidationResults,
        setIncludeInvalidRecords,
        setMergeStrategy,
        setRecordResult,
        setReconciliations,
        clearReconciliations,
        setConflictAction,
    }
}