import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from ***REMOVED***./types***REMOVED***
import type { ImportReconciliation } from ***REMOVED***./reconciliation***REMOVED***
import { reconcileImportRecords } from ***REMOVED***./reconciliation***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***

export type ImportAllDiscoveryStatus = ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***ready***REMOVED*** | ***REMOVED***error***REMOVED***
export type ImportAllPreparationStatus = ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***ready***REMOVED*** | ***REMOVED***error***REMOVED***

export type ImportAllValidationResult = {
    record: CanonicalImportRecord
    isValid: boolean
    errors: string[]
}

export type ImportAllSourcePlan = {
    sourceId: string
    type: string
    label: string
    enabled: boolean
    importUrl: string
    status: ImportAllDiscoveryStatus
    preparationStatus: ImportAllPreparationStatus
    candidates: ImportCandidate[]
    records: CanonicalImportRecord[]
    validationResults: ImportAllValidationResult[]
    reconciliations: ImportReconciliation[]
    error?: string
}

export type ImportAllPlanSource = {
    type: string
    label: string
    sourceAdapter: ImportSourceAdapter
}

export const createImportAllSourcePlan = (source: ImportAllPlanSource): ImportAllSourcePlan => ({
    sourceId: source.sourceAdapter.id,
    type: source.type,
    label: source.label,
    enabled: true,
    importUrl: source.sourceAdapter.defaultImportUrl,
    status: ***REMOVED***idle***REMOVED***,
    preparationStatus: ***REMOVED***idle***REMOVED***,
    candidates: [],
    records: [],
    validationResults: [],
    reconciliations: [],
})

export const discoverImportAllSource = async ({
    source,
    plan,
    limit,
    signal,
}: {
    source: ImportAllPlanSource
    plan: ImportAllSourcePlan
    limit?: number
    signal: AbortSignal
}): Promise<ImportAllSourcePlan> => {
    try {
        const candidates = await source.sourceAdapter.discover({
            url: plan.importUrl,
            signal,
        })
        return {
            ...plan,
            status: ***REMOVED***ready***REMOVED***,
            preparationStatus: ***REMOVED***idle***REMOVED***,
            candidates: limit === undefined ? candidates : candidates.slice(0, Math.max(0, limit)),
            records: [],
            validationResults: [],
            reconciliations: [],
            error: undefined,
        }
    } catch (error) {
        if (signal.aborted) throw error
        return {
            ...plan,
            status: ***REMOVED***error***REMOVED***,
            preparationStatus: ***REMOVED***idle***REMOVED***,
            candidates: [],
            records: [],
            validationResults: [],
            reconciliations: [],
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

type ExistingDocumentFetcher = (options: {
    records: CanonicalImportRecord[]
    objectTypeUuid: string
    token: string
    signal?: AbortSignal
}) => Promise<IDocument[]>

export type ImportAllRecordValidator = (
    schema: JSONSchema6,
    record: CanonicalImportRecord
) => { isValid: boolean; errors: string[] }

export const prepareImportAllSource = async ({
    source,
    plan,
    schema,
    objectTypeUuid,
    token,
    signal,
    validator,
    fetchExisting,
}: {
    source: ImportAllPlanSource
    plan: ImportAllSourcePlan
    schema: JSONSchema6
    objectTypeUuid: string
    token: string
    signal: AbortSignal
    validator: ImportAllRecordValidator
    fetchExisting: ExistingDocumentFetcher
}): Promise<ImportAllSourcePlan> => {
    try {
        const loadResults = await Promise.allSettled(
            plan.candidates.map((candidate) => source.sourceAdapter.load({
                candidate,
                detailRoot: source.sourceAdapter.defaultDetailRoot,
                signal,
            }))
        )
        if (signal.aborted) throw new DOMException(***REMOVED***Preparation cancelled***REMOVED***, ***REMOVED***AbortError***REMOVED***)

        const loadErrors = loadResults.filter(
            (result): result is PromiseRejectedResult => result.status === ***REMOVED***rejected***REMOVED***
        )
        if (loadErrors.length > 0) {
            throw new Error(
                `${loadErrors.length} of ${plan.candidates.length} records could not be loaded: ${String(loadErrors[0].reason)}`
            )
        }

        const records = loadResults.map(
            (result) => (result as PromiseFulfilledResult<CanonicalImportRecord>).value
        )
        const validationResults = records.map((record) => ({
            record,
            ...validator(schema, record),
        }))
        const validRecords = validationResults
            .filter(({ isValid }) => isValid)
            .map(({ record }) => record)
        const existingDocuments = validRecords.length > 0
            ? await fetchExisting({ records: validRecords, objectTypeUuid, token, signal })
            : []

        return {
            ...plan,
            preparationStatus: ***REMOVED***ready***REMOVED***,
            records,
            validationResults,
            reconciliations: reconcileImportRecords(validRecords, existingDocuments),
            error: undefined,
        }
    } catch (error) {
        if (signal.aborted) throw error
        return {
            ...plan,
            preparationStatus: ***REMOVED***error***REMOVED***,
            records: [],
            validationResults: [],
            reconciliations: [],
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export const summarizeImportAllPlan = (plans: ImportAllSourcePlan[]) => ({
    enabledSources: plans.filter((plan) => plan.enabled).length,
    readySources: plans.filter((plan) => plan.enabled && plan.status === ***REMOVED***ready***REMOVED***).length,
    failedSources: plans.filter((plan) => plan.enabled && plan.status === ***REMOVED***error***REMOVED***).length,
    preparedSources: plans.filter(
        (plan) => plan.enabled && plan.preparationStatus === ***REMOVED***ready***REMOVED***
    ).length,
    preparationErrors: plans.filter(
        (plan) => plan.enabled && plan.preparationStatus === ***REMOVED***error***REMOVED***
    ).length,
    records: plans.reduce(
        (total, plan) => total + (plan.enabled && plan.status === ***REMOVED***ready***REMOVED*** ? plan.candidates.length : 0),
        0
    ),
    validRecords: plans.reduce(
        (total, plan) => total + plan.validationResults.filter(({ isValid }) => isValid).length,
        0
    ),
    invalidRecords: plans.reduce(
        (total, plan) => total + plan.validationResults.filter(({ isValid }) => !isValid).length,
        0
    ),
    conflicts: plans.reduce(
        (total, plan) => total + plan.reconciliations.filter(
            ({ status }) => status === ***REMOVED***conflicting***REMOVED*** || status === ***REMOVED***ambiguous***REMOVED***
        ).length,
        0
    ),
})