import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from './types'
import type { ImportReconciliation } from './reconciliation'
import { reconcileImportRecords } from './reconciliation'
import type { JSONSchema6 } from 'json-schema'
import type { IDocument } from '@/types/types'

export type ImportAllDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ImportAllPreparationStatus = 'idle' | 'loading' | 'ready' | 'error'

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
    status: 'idle',
    preparationStatus: 'idle',
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
            status: 'ready',
            preparationStatus: 'idle',
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
            status: 'error',
            preparationStatus: 'idle',
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
        if (signal.aborted) throw new DOMException('Preparation cancelled', 'AbortError')

        const loadErrors = loadResults.filter(
            (result): result is PromiseRejectedResult => result.status === 'rejected'
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
            preparationStatus: 'ready',
            records,
            validationResults,
            reconciliations: reconcileImportRecords(validRecords, existingDocuments),
            error: undefined,
        }
    } catch (error) {
        if (signal.aborted) throw error
        return {
            ...plan,
            preparationStatus: 'error',
            records: [],
            validationResults: [],
            reconciliations: [],
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export const summarizeImportAllPlan = (plans: ImportAllSourcePlan[]) => ({
    enabledSources: plans.filter((plan) => plan.enabled).length,
    readySources: plans.filter((plan) => plan.enabled && plan.status === 'ready').length,
    failedSources: plans.filter((plan) => plan.enabled && plan.status === 'error').length,
    preparedSources: plans.filter(
        (plan) => plan.enabled && plan.preparationStatus === 'ready'
    ).length,
    preparationErrors: plans.filter(
        (plan) => plan.enabled && plan.preparationStatus === 'error'
    ).length,
    records: plans.reduce(
        (total, plan) => total + (plan.enabled && plan.status === 'ready' ? plan.candidates.length : 0),
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
            ({ status }) => status === 'conflicting' || status === 'ambiguous'
        ).length,
        0
    ),
})