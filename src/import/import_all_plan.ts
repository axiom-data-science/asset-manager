import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from './types'
import type { ImportReconciliation } from './reconciliation'
import { reconcileImportRecords } from './reconciliation'
import type { JSONSchema6 } from 'json-schema'
import type { IDocument } from '@/types/types'
import { mergeIncomingNonEmpty, withImportProvenance, type ImportConflictAction, type ImportMergeStrategy } from './reconciliation'

export type ImportAllDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ImportAllPreparationStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ImportAllExecutionStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ImportAllExecutionResult = {
    recordKey: string
    action?: ImportConflictAction
    status: 'imported' | 'ignored' | 'blocked' | 'failed'
    documentUuid?: string
    error?: string
}

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
    preparationCompleted: number
    preparationTotal: number
    executionStatus: ImportAllExecutionStatus
    defaultConflictAction: Exclude<ImportConflictAction, 'create'>
    conflictActions: Record<string, Exclude<ImportConflictAction, 'create'>>
    candidates: ImportCandidate[]
    records: CanonicalImportRecord[]
    validationResults: ImportAllValidationResult[]
    reconciliations: ImportReconciliation[]
    executionResults: ImportAllExecutionResult[]
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
    preparationCompleted: 0,
    preparationTotal: 0,
    executionStatus: 'idle',
    defaultConflictAction: 'ignore',
    conflictActions: {},
    candidates: [],
    records: [],
    validationResults: [],
    reconciliations: [],
    executionResults: [],
})

export const importAllRecordKey = (record: CanonicalImportRecord): string =>
    `${record.provenance.sourceId}:${record.provenance.externalId}`

type ImportAllPersistence = {
    post: (document: Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>, signal: AbortSignal) => Promise<IDocument>
    patch: (uuid: string, document: Partial<IDocument>, signal: AbortSignal) => Promise<IDocument>
    mergeRpc: (uuid: string, document: Partial<IDocument>, signal: AbortSignal) => Promise<IDocument>
    fetchBySlug: (slug: string, objectTypeUuid: string, signal: AbortSignal) => Promise<IDocument | undefined>
}

export const executeImportAllSource = async ({
    plan,
    objectTypeUuid,
    signal,
    mergeStrategy,
    persistence,
    recordKeys,
}: {
    plan: ImportAllSourcePlan
    objectTypeUuid: string
    signal: AbortSignal
    mergeStrategy: ImportMergeStrategy
    persistence: ImportAllPersistence
    recordKeys?: ReadonlySet<string>
}): Promise<ImportAllSourcePlan> => {
    const validationByKey = new Map(
        plan.validationResults.map((result) => [importAllRecordKey(result.record), result])
    )
    const results: ImportAllExecutionResult[] = []

    for (const reconciliation of plan.reconciliations) {
        if (signal.aborted) throw new DOMException('Execution cancelled', 'AbortError')
        const recordKey = importAllRecordKey(reconciliation.record)
        if (recordKeys && !recordKeys.has(recordKey)) continue
        const validation = validationByKey.get(recordKey)
        if (!validation?.isValid || reconciliation.status === 'ambiguous') {
            results.push({ recordKey, status: 'blocked', action: reconciliation.action })
            continue
        }

        const action = reconciliation.status === 'new'
            ? 'create'
            : reconciliation.status === 'exact'
                ? 'ignore'
                : plan.conflictActions[recordKey] ?? plan.defaultConflictAction
        if (action === 'ignore') {
            results.push({ recordKey, action, status: 'ignored' })
            continue
        }

        try {
            const record = reconciliation.record
            const incomingDocument = {
                object_type_uuid: objectTypeUuid,
                label: record.label,
                description: record.description,
                slug: record.slug,
                data: record.data,
                attrs: withImportProvenance(record.attrs, record.provenance),
            } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>

            if (action === 'create') {
                const existing = await persistence.fetchBySlug(record.slug, objectTypeUuid, signal)
                if (existing) throw new Error(`Document "${record.slug}" already exists. Return to duplicate check.`)
                const created = await persistence.post(incomingDocument, signal)
                results.push({ recordKey, action, status: 'imported', documentUuid: created.uuid })
            } else {
                const existing = reconciliation.existingDocuments[0]
                if (!existing) throw new Error('Existing document was not found')
                const document = action === 'merge'
                    ? {
                        label: mergeIncomingNonEmpty(existing.label, record.label) as string,
                        description: mergeIncomingNonEmpty(existing.description, record.description) as string,
                        slug: mergeIncomingNonEmpty(existing.slug, record.slug) as string,
                        data: mergeIncomingNonEmpty(existing.data, record.data),
                        attrs: withImportProvenance(
                            mergeIncomingNonEmpty(existing.attrs, incomingDocument.attrs),
                            record.provenance
                        ),
                    }
                    : incomingDocument
                if (action === 'merge' && mergeStrategy === 'postgrest-rpc') {
                    await persistence.mergeRpc(existing.uuid, document, signal)
                } else {
                    await persistence.patch(existing.uuid, document, signal)
                }
                results.push({ recordKey, action, status: 'imported', documentUuid: existing.uuid })
            }
        } catch (error) {
            results.push({
                recordKey,
                action,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    return { ...plan, executionStatus: 'ready', executionResults: results }
}

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

export const refreshImportAllSourceReconciliation = async ({
    plan,
    recordKeys,
    objectTypeUuid,
    token,
    signal,
    fetchExisting,
}: {
    plan: ImportAllSourcePlan
    recordKeys: ReadonlySet<string>
    objectTypeUuid: string
    token: string
    signal: AbortSignal
    fetchExisting: ExistingDocumentFetcher
}): Promise<ImportAllSourcePlan> => {
    const records = plan.records.filter((record) => recordKeys.has(importAllRecordKey(record)))
    const existingDocuments = records.length > 0
        ? await fetchExisting({ records, objectTypeUuid, token, signal })
        : []
    const refreshed = reconcileImportRecords(records, existingDocuments)
    const refreshedByKey = new Map(
        refreshed.map((reconciliation) => [importAllRecordKey(reconciliation.record), reconciliation])
    )
    return {
        ...plan,
        reconciliations: plan.reconciliations.map((reconciliation) =>
            refreshedByKey.get(importAllRecordKey(reconciliation.record)) ?? reconciliation
        ),
    }
}

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
    batchSize = 10,
    onProgress,
}: {
    source: ImportAllPlanSource
    plan: ImportAllSourcePlan
    schema?: JSONSchema6
    objectTypeUuid?: string
    token: string
    signal: AbortSignal
    validator?: ImportAllRecordValidator
    fetchExisting: ExistingDocumentFetcher
    batchSize?: number
    onProgress?: (completed: number, total: number) => void
}): Promise<ImportAllSourcePlan> => {
    try {
        const loadResults: PromiseSettledResult<CanonicalImportRecord>[] = []
        const total = plan.candidates.length
        onProgress?.(0, total)
        for (let index = 0; index < total; index += Math.max(1, batchSize)) {
            const batch = plan.candidates.slice(index, index + Math.max(1, batchSize))
            const results = await Promise.allSettled(
                batch.map((candidate) => source.sourceAdapter.load({
                    candidate,
                    detailRoot: source.sourceAdapter.defaultDetailRoot,
                    signal,
                }))
            )
            loadResults.push(...results)
            onProgress?.(loadResults.length, total)
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
        }
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
            ...(schema && validator
                ? validator(schema, record)
                : { isValid: true, errors: [] }),
        }))
        const validRecords = validationResults
            .filter(({ isValid }) => isValid)
            .map(({ record }) => record)
        const existingDocuments = validRecords.length > 0 && objectTypeUuid
            ? await fetchExisting({ records: validRecords, objectTypeUuid, token, signal })
            : []

        return {
            ...plan,
            preparationStatus: 'ready',
            preparationCompleted: records.length,
            preparationTotal: records.length,
            records,
            validationResults,
            reconciliations: objectTypeUuid
                ? reconcileImportRecords(validRecords, existingDocuments)
                : [],
            error: undefined,
        }
    } catch (error) {
        if (signal.aborted) throw error
        return {
            ...plan,
            preparationStatus: 'error',
            preparationCompleted: 0,
            preparationTotal: plan.candidates.length,
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