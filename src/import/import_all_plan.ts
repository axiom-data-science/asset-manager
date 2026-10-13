import type {
  CanonicalImportRecord,
  ImportCandidate,
  ImportCompositeSourceAdapter,
  ImportSourceAdapter,
  ImportWorkflowPolicy,
  ImportReviewStep,
  ImportReadinessDecision,
} from './types'
import { cloneDeep, isEqual } from 'lodash-es'
import type { ImportReconciliation } from './reconciliation'
import { reconcileImportRecords } from './reconciliation'
import type { JSONSchema6 } from 'json-schema'
import type { IDocument } from '@/types/types'
import {
  mergeIncomingNonEmpty,
  withImportProvenance,
  type ImportConflictAction,
  type ImportMergeStrategy,
} from './reconciliation'
import type {
  ImportRelationshipPersistenceResult,
  ImportRelationshipPlan,
} from './relationship_planning'
import type { ImportArraySourceTarget } from './types'
import { relationshipDocumentKey } from './relationship_planning'

export type ImportAllDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ImportAllPreparationStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ImportAllExecutionStatus = 'idle' | 'loading' | 'ready' | 'error'

export const IMPORT_ALL_EXECUTION_BATCH_SIZE = 10
export const IMPORT_ALL_EXECUTION_DELAY_MS = 500

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
  executionCompleted: number
  executionTotal: number
  defaultConflictAction: Exclude<ImportConflictAction, 'create'>
  conflictActions: Record<string, Exclude<ImportConflictAction, 'create'>>
  candidates: ImportCandidate[]
  records: CanonicalImportRecord[]
  validationResults: ImportAllValidationResult[]
  validationContext?: {
    schema: JSONSchema6
    objectTypeUuid?: string
    records: CanonicalImportRecord[]
  }
  reconciliations: ImportReconciliation[]
  executionResults: ImportAllExecutionResult[]
  error?: string
}

export const mergeImportAllExecutionPlan = (
  currentPlan: ImportAllSourcePlan,
  returnedPlan: ImportAllSourcePlan
): ImportAllSourcePlan => {
  const executionResults = new Map(
    currentPlan.executionResults.map((result) => [result.recordKey, result])
  )
  for (const result of returnedPlan.executionResults) {
    const retained = executionResults.get(result.recordKey)
    if (retained?.status !== 'imported' && retained?.status !== 'ignored') {
      executionResults.set(result.recordKey, result)
    }
  }
  return { ...currentPlan, ...returnedPlan, executionResults: [...executionResults.values()] }
}

export const importAllReadinessMessage = (readiness: ImportReadinessDecision): string | undefined => {
  if (readiness.status === 'complete') return undefined
  if (readiness.status === 'advance') {
    return `Source requires ${readiness.action}. Prepare the source again before executing.`
  }
  if (readiness.status === 'needs-input') {
    return `Complete ${readiness.step} before executing${readiness.inputKeys?.length ? `: ${readiness.inputKeys.join(', ')}` : '.'}`
  }
  const messages: Record<typeof readiness.reason, string> = {
    busy: 'Another import operation is still running.',
    'source-error': 'Resolve the source error and prepare again.',
    permission: 'Import is not permitted for this session.',
    'invalid-records': 'Correct or exclude invalid records and prepare again.',
    'ambiguous-matches': 'Resolve ambiguous document matches and prepare again.',
    relationships: 'Resolve relationship blockers before executing.',
    'execution-errors': 'Retry failed records or resolve blocked document results.',
  }
  return messages[readiness.reason]
}

export type ImportAllPlanSource = {
  type: string
  label: string
  sourceAdapter: ImportSourceAdapter
  compositeSourceAdapter?: ImportCompositeSourceAdapter
  workflowPolicy?: ImportWorkflowPolicy
}

export type ImportAllError = {
  sourceId: string
  sourceLabel: string
  scope: 'source' | 'validation' | 'document' | 'relationship'
  recordKey?: string
  message: string
}

export const collectImportAllErrors = ({
  plans,
  relationshipPlans = [],
  relationshipResults = [],
}: {
  plans: ImportAllSourcePlan[]
  relationshipPlans?: ImportRelationshipPlan[]
  relationshipResults?: ImportRelationshipPersistenceResult[]
}): ImportAllError[] => {
  const errors: ImportAllError[] = []
  const sourceByType = new Map(plans.map((plan) => [plan.type, plan]))

  for (const plan of plans) {
    if (plan.error) {
      errors.push({
        sourceId: plan.sourceId,
        sourceLabel: plan.label,
        scope: plan.preparationStatus === 'error' ? 'source' : 'source',
        message: plan.error,
      })
    }
    for (const result of plan.validationResults) {
      if (!result.isValid) {
        errors.push({
          sourceId: plan.sourceId,
          sourceLabel: plan.label,
          scope: 'validation',
          recordKey: importAllRecordKey(result.record),
          message: result.errors.join('; ') || 'Record failed validation.',
        })
      }
    }
    for (const result of plan.executionResults) {
      if (result.status === 'failed') {
        errors.push({
          sourceId: plan.sourceId,
          sourceLabel: plan.label,
          scope: 'document',
          recordKey: result.recordKey,
          message: result.error || 'Document import failed.',
        })
      }
    }
  }

  for (const plan of relationshipPlans) {
    if (plan.status === 'ready') continue
    const sourcePlan = sourceByType.get(plan.child.objectTypeSlug)
    errors.push({
      sourceId: plan.child.record.provenance.sourceId,
      sourceLabel: sourcePlan?.label ?? plan.child.objectTypeSlug,
      scope: 'relationship',
      recordKey: importAllRecordKey(plan.child.record),
      message: plan.reason || `Relationship is ${plan.status}.`,
    })
  }

  for (const result of relationshipResults) {
    if (result.status === 'failed' || result.status === 'blocked' || result.status === 'unattempted') {
      errors.push({
        sourceId: result.relationshipKey.split(':')[1] ?? 'relationship',
        sourceLabel: 'Relationship',
        scope: 'relationship',
        recordKey: result.relationshipKey,
        message: result.error || 'Relationship write failed.',
      })
    }
  }

  return errors
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
  executionCompleted: 0,
  executionTotal: 0,
  defaultConflictAction: source.workflowPolicy?.defaultConflictAction ?? 'ignore',
  conflictActions: {},
  candidates: [],
  records: [],
  validationResults: [],
  reconciliations: [],
  executionResults: [],
})

export const importAllRecordKey = (record: CanonicalImportRecord): string =>
  `${record.provenance.sourceId}:${record.provenance.externalId}`

export const evaluateImportSourceReadiness = ({
  plan,
  policy = {},
  objectTypeUuid,
  schema,
  canWrite,
  canCreateType = false,
  inputValues = {},
  optedInReviewSteps = [],
  completedReviewSteps = [],
  relationshipBlockers = [],
}: {
  plan: ImportAllSourcePlan
  policy?: ImportWorkflowPolicy
  objectTypeUuid?: string
  schema?: JSONSchema6
  canWrite: boolean
  canCreateType?: boolean
  inputValues?: Record<string, unknown>
  optedInReviewSteps?: ImportReviewStep[]
  completedReviewSteps?: ImportReviewStep[]
  relationshipBlockers?: readonly string[]
}): ImportReadinessDecision => {
  if (!plan.enabled) return { status: 'complete' }
  if (!canWrite) return { status: 'blocked', reason: 'permission' }
  if ([plan.status, plan.preparationStatus, plan.executionStatus].includes('loading')) {
    return { status: 'blocked', reason: 'busy' }
  }
  if (plan.error || plan.status === 'error' || plan.preparationStatus === 'error') {
    return { status: 'blocked', reason: 'source-error' }
  }
  const missingInputs = (policy.inputs ?? []).filter(({ key, required }) => {
    const value = inputValues[key]
    return required && (value === undefined || value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0))
  })
  const missingStep = missingInputs[0]?.step
  if (missingStep) {
    return {
      status: 'needs-input',
      step: missingStep,
      inputKeys: missingInputs.filter(({ step }) => step === missingStep).map(({ key }) => key),
    }
  }
  if (plan.preparationStatus !== 'ready') return { status: 'advance', action: 'prepare' }
  if (plan.records.length === 0) return { status: 'complete' }
  const reviewSteps = new Set([
    ...(policy.reviewSteps ?? []),
    ...optedInReviewSteps,
    ...(policy.mode === 'interactive' ? ['review' as const] : []),
  ])
  for (const step of reviewSteps) {
    if ((step === 'mapping' || step === 'overrides' || step === 'type-schema') &&
      !completedReviewSteps.includes(step)) {
      return { status: 'needs-input', step }
    }
  }
  if (!objectTypeUuid) {
    if (!policy.allowAutomaticTypeCreation) return { status: 'needs-input', step: 'type-schema' }
    return canCreateType
      ? { status: 'advance', action: 'create-type' }
      : { status: 'blocked', reason: 'permission' }
  }
  if (!schema) return { status: 'needs-input', step: 'type-schema' }
  const context = plan.validationContext
  const validationByKey = new Map(plan.validationResults.map((result) =>
    [importAllRecordKey(result.record), result]))
  if (!context || context.objectTypeUuid !== objectTypeUuid ||
    !isEqual(context.schema, schema) || !isEqual(context.records, plan.records) ||
    validationByKey.size !== plan.records.length ||
    !plan.records.every((record) => isEqual(validationByKey.get(importAllRecordKey(record))?.record, record))) {
    return { status: 'advance', action: 'validate' }
  }
  if (plan.validationResults.some(({ isValid }) => !isValid)) {
    return { status: 'blocked', reason: 'invalid-records' }
  }
  const reconciliationByKey = new Map(plan.reconciliations.map((result) =>
    [importAllRecordKey(result.record), result]))
  if (reconciliationByKey.size !== plan.records.length ||
    !plan.records.every((record) => isEqual(reconciliationByKey.get(importAllRecordKey(record))?.record, record))) {
    return { status: 'advance', action: 'reconcile' }
  }
  if (plan.reconciliations.some(({ status }) => status === 'ambiguous')) {
    return { status: 'blocked', reason: 'ambiguous-matches' }
  }
  if (relationshipBlockers.length > 0) return { status: 'blocked', reason: 'relationships' }
  if (plan.executionStatus === 'error' ||
    plan.executionResults.some(({ status }) => status === 'failed' || status === 'blocked')) {
    return { status: 'blocked', reason: 'execution-errors' }
  }
  const completedKeys = new Set(plan.executionResults.filter(({ status }) =>
    status === 'imported' || status === 'ignored').map(({ recordKey }) => recordKey))
  if (plan.records.every((record) => completedKeys.has(importAllRecordKey(record)))) {
    return { status: 'complete' }
  }
  if ((!policy.defaultConflictAction || policy.defaultConflictAction !== plan.defaultConflictAction) && plan.reconciliations.some((result) =>
    result.status === 'conflicting' && !plan.conflictActions[importAllRecordKey(result.record)])) {
    reviewSteps.add('review')
  }
  for (const step of reviewSteps) {
    if (!completedReviewSteps.includes(step)) return { status: 'needs-input', step }
  }
  return { status: 'advance', action: 'execute' }
}

const getRecordPathValue = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)

const getRecordMatchValue = (record: CanonicalImportRecord, path: string): unknown =>
  getRecordPathValue(record.data, path) ?? getRecordPathValue(record.sourceData, path)

const normalizeMatchValue = (value: unknown): string => String(value).trim()

export const mergeArraySourceRecordsIntoParentRecords = ({
  parentRecords,
  arrayRecords,
  target,
}: {
  parentRecords: CanonicalImportRecord[]
  arrayRecords: CanonicalImportRecord[]
  target: ImportArraySourceTarget
}): { records: CanonicalImportRecord[]; unmatchedArrayRecords: CanonicalImportRecord[] } => {
  const arrayRecordsByParentValue = new Map<string, CanonicalImportRecord[]>()
  for (const arrayRecord of arrayRecords) {
    const parentValue = getRecordMatchValue(arrayRecord, target.rowMatchField)
    if (parentValue === undefined || parentValue === null) continue
    const key = normalizeMatchValue(parentValue)
    arrayRecordsByParentValue.set(key, [
      ...(arrayRecordsByParentValue.get(key) ?? []),
      arrayRecord,
    ])
  }

  const unmatchedArrayRecords = [...arrayRecords]
  const records = parentRecords.map((parentRecord) => {
    const parentValue = getRecordMatchValue(parentRecord, target.parentMatchField)
    const matchingArrayRecords =
      parentValue === undefined || parentValue === null
        ? []
        : arrayRecordsByParentValue.get(normalizeMatchValue(parentValue)) ?? []
    if (matchingArrayRecords.length === 0) return parentRecord

    const matchingKeys = new Set(
      matchingArrayRecords.map((arrayRecord) => importAllRecordKey(arrayRecord))
    )
    for (let index = unmatchedArrayRecords.length - 1; index >= 0; index -= 1) {
      if (matchingKeys.has(importAllRecordKey(unmatchedArrayRecords[index]))) {
        unmatchedArrayRecords.splice(index, 1)
      }
    }

    const existingItems = getRecordPathValue(parentRecord.data, target.arrayFieldPath)
    const arrayItems = Array.isArray(existingItems) ? existingItems : []
    const data = { ...(parentRecord.data as Record<string, unknown>) }
    let targetData = data
    const segments = target.arrayFieldPath.split('.')
    const finalSegment = segments.pop()
    for (const segment of segments) {
      const nested = (targetData[segment] ?? {}) as Record<string, unknown>
      targetData[segment] = nested
      targetData = nested
    }
    if (finalSegment) {
      targetData[finalSegment] = [
        ...arrayItems,
        ...matchingArrayRecords.map((arrayRecord) => arrayRecord.data),
      ]
    }
    return { ...parentRecord, data }
  })

  return { records, unmatchedArrayRecords }
}

export const formatUnmatchedArrayRowsError = (count: number): string =>
  `${count} array ${count === 1 ? 'row' : 'rows'} did not match a parent record.`

export const collectImportDocumentUuids = ({
  executedPlans,
  objectTypesBySlug,
}: {
  executedPlans: ImportAllSourcePlan[]
  objectTypesBySlug: Record<string, { uuid: string; slug: string } | undefined>
}): Map<string, string> => {
  const documentUuids = new Map<string, string>()

  for (const plan of executedPlans) {
    const objectType = objectTypesBySlug[plan.type]
    if (!objectType) continue
    const recordsByKey = new Map(plan.records.map((record) => [importAllRecordKey(record), record]))
    const reconciliationsByKey = new Map(
      plan.reconciliations.map((reconciliation) => [
        importAllRecordKey(reconciliation.record),
        reconciliation,
      ])
    )

    for (const reconciliation of plan.reconciliations) {
      const existingUuid = reconciliation.existingDocuments[0]?.uuid
      if (!existingUuid) continue
      const record = reconciliation.record
      documentUuids.set(
        relationshipDocumentKey({
          record,
          objectTypeUuid: objectType.uuid,
          objectTypeSlug: objectType.slug,
        }),
        existingUuid
      )
    }

    for (const result of plan.executionResults) {
      const record = recordsByKey.get(result.recordKey)
      if (!record) continue
      const reconciliation = reconciliationsByKey.get(result.recordKey)
      const uuid = result.documentUuid ?? reconciliation?.existingDocuments[0]?.uuid
      if (uuid) {
        documentUuids.set(
          relationshipDocumentKey({
            record,
            objectTypeUuid: objectType.uuid,
            objectTypeSlug: objectType.slug,
          }),
          uuid
        )
      }
    }
  }

  return documentUuids
}

type ImportAllPersistence = {
  post: (
    document: Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>,
    signal: AbortSignal
  ) => Promise<IDocument>
  patch: (uuid: string, document: Partial<IDocument>, signal: AbortSignal) => Promise<IDocument>
  mergeRpc: (uuid: string, document: Partial<IDocument>, signal: AbortSignal) => Promise<IDocument>
  fetchBySlug: (
    slug: string,
    objectTypeUuid: string,
    signal: AbortSignal
  ) => Promise<IDocument | undefined>
}

const getRetryableImportAllRecordKeys = (
  plan: ImportAllSourcePlan,
  requestedKeys: ReadonlySet<string>,
  allowFailed: boolean
): Set<string> => {
  const priorResults = new Map(plan.executionResults.map((result) => [result.recordKey, result]))
  return new Set(
    plan.records.flatMap((record) => {
      const recordKey = importAllRecordKey(record)
      const priorResult = priorResults.get(recordKey)
      return requestedKeys.has(recordKey) &&
        (!priorResult || (allowFailed && priorResult.status === 'failed'))
        ? [recordKey]
        : []
    })
  )
}

const mergeImportAllExecutionResults = (
  plan: ImportAllSourcePlan,
  updatedResults: ImportAllExecutionResult[]
): ImportAllExecutionResult[] => {
  const resultsByKey = new Map(plan.executionResults.map((result) => [result.recordKey, result]))
  for (const result of updatedResults) resultsByKey.set(result.recordKey, result)
  const orderedResults = plan.records.flatMap((record) => {
    const result = resultsByKey.get(importAllRecordKey(record))
    return result ? [result] : []
  })
  const recordKeys = new Set(plan.records.map(importAllRecordKey))
  return [
    ...orderedResults,
    ...[...resultsByKey.values()].filter((result) => !recordKeys.has(result.recordKey)),
  ]
}

const isExecutionAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

export const executeImportAllSource = async ({
  plan,
  objectTypeUuid,
  signal,
  mergeStrategy,
  persistence,
  recordKeys,
  batchSize = IMPORT_ALL_EXECUTION_BATCH_SIZE,
  delayMsBetweenBatches = IMPORT_ALL_EXECUTION_DELAY_MS,
  onProgress,
}: {
  plan: ImportAllSourcePlan
  objectTypeUuid: string
  signal: AbortSignal
  mergeStrategy: ImportMergeStrategy
  persistence: ImportAllPersistence
  recordKeys?: ReadonlySet<string>
  batchSize?: number
  delayMsBetweenBatches?: number
  onProgress?: (completed: number, total: number) => void
}): Promise<ImportAllSourcePlan> => {
  console.log('[Import All] document execution started', {
    sourceId: plan.sourceId,
    type: plan.type,
    records: plan.records.length,
    reconciliations: plan.reconciliations.length,
    objectTypeUuid,
  })
  const validationByKey = new Map(
    plan.validationResults.map((result) => [importAllRecordKey(result.record), result])
  )
  const results: ImportAllExecutionResult[] = []
  const requestedKeys = recordKeys ?? new Set(plan.records.map(importAllRecordKey))
  const retryableKeys = getRetryableImportAllRecordKeys(plan, requestedKeys, recordKeys !== undefined)
  const reconciliations = plan.reconciliations.filter((reconciliation) => {
    const recordKey = importAllRecordKey(reconciliation.record)
    return retryableKeys.has(recordKey)
  })
  const total = reconciliations.length
  let completed = 0

  const waitBetweenBatches = async () => {
    if (delayMsBetweenBatches <= 0) return
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, delayMsBetweenBatches)
      const abort = () => {
        clearTimeout(timeout)
        reject(new DOMException('Execution cancelled', 'AbortError'))
      }
      if (signal.aborted) {
        abort()
        return
      }
      signal.addEventListener('abort', abort, { once: true })
      setTimeout(() => signal.removeEventListener('abort', abort), delayMsBetweenBatches)
    })
  }

  const executeReconciliation = async (
    reconciliation: ImportReconciliation
  ): Promise<ImportAllExecutionResult> => {
    if (signal.aborted) throw new DOMException('Execution cancelled', 'AbortError')
    const recordKey = importAllRecordKey(reconciliation.record)
    const validation = validationByKey.get(recordKey)
    if (!validation?.isValid || reconciliation.status === 'ambiguous') {
      return { recordKey, status: 'blocked', action: reconciliation.action }
    }

    const action =
      reconciliation.status === 'new'
        ? 'create'
        : reconciliation.status === 'exact'
          ? 'ignore'
          : (plan.conflictActions[recordKey] ?? plan.defaultConflictAction)
    console.log('[Import All] document action selected', {
      sourceId: plan.sourceId,
      recordKey,
      slug: reconciliation.record.slug,
      reconciliationStatus: reconciliation.status,
      action,
      existingUuid: reconciliation.existingDocuments[0]?.uuid,
    })
    if (action === 'ignore') {
      return {
        recordKey,
        action,
        status: 'ignored',
        documentUuid: reconciliation.existingDocuments[0]?.uuid,
      }
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
        console.log('[Import All] checking for late document conflict', {
          sourceId: plan.sourceId,
          recordKey,
          slug: record.slug,
          objectTypeUuid,
        })
        const existing = await persistence.fetchBySlug(record.slug, objectTypeUuid, signal)
        if (existing)
          throw new Error(`Document "${record.slug}" already exists. Return to duplicate check.`)
        signal.throwIfAborted()
        console.log('[Import All] about to POST document', {
          sourceId: plan.sourceId,
          recordKey,
          slug: record.slug,
          objectTypeUuid,
        })
        const created = await persistence.post(incomingDocument, signal)
        return { recordKey, action, status: 'imported', documentUuid: created.uuid }
      }

      const existing = reconciliation.existingDocuments[0]
      if (!existing) throw new Error('Existing document was not found')
      const document =
        action === 'merge'
          ? {
            label: mergeIncomingNonEmpty(existing.label, record.label) as string,
            description: mergeIncomingNonEmpty(
              existing.description,
              record.description
            ) as string,
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
      return { recordKey, action, status: 'imported', documentUuid: existing.uuid }
    } catch (error) {
      if (isExecutionAbort(error)) throw error
      return {
        recordKey,
        action,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  for (let start = 0; start < reconciliations.length; start += Math.max(1, batchSize)) {
    if (signal.aborted) break
    const batch = reconciliations.slice(start, start + Math.max(1, batchSize))
    const batchResults = await Promise.allSettled(
      batch.map(async (reconciliation) => {
        const result = await executeReconciliation(reconciliation)
        completed += 1
        onProgress?.(completed, total)
        return result
      })
    )
    let cancelled = false
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        results.push(batchResult.value)
      } else if (isExecutionAbort(batchResult.reason)) {
        cancelled = true
      } else {
        throw batchResult.reason
      }
    }
    if (signal.aborted) cancelled = true
    if (cancelled) break
    if (start + batch.length < reconciliations.length) {
      try {
        await waitBetweenBatches()
      } catch (error) {
        if (!isExecutionAbort(error)) throw error
        break
      }
    }
  }

  return {
    ...plan,
    executionStatus: 'ready',
    executionCompleted: completed,
    executionTotal: total,
    executionResults: mergeImportAllExecutionResults(plan, results),
  }
}

type ImportAllPreparedSourceDecision =
  | { status: 'paused'; readiness: ImportReadinessDecision; reason: 'readiness' }
  | {
    status: 'paused'
    readiness: Extract<ImportReadinessDecision, { status: 'advance' }>
    reason: 'unsupported-stage'
    unsupportedAction: Exclude<Extract<ImportReadinessDecision, { status: 'advance' }>['action'], 'execute'>
  }
  | {
    status: 'executed'
    readiness: ImportReadinessDecision
    cancelled?: boolean
  }

export const executePreparedImportAllSource = async ({
  plan,
  policy = {},
  objectTypeUuid,
  schema,
  canWrite,
  canCreateType,
  inputValues,
  optedInReviewSteps,
  completedReviewSteps,
  relationshipBlockers,
  signal,
  mergeStrategy,
  persistence,
  recordKeys,
  batchSize,
  delayMsBetweenBatches,
  onProgress,
  retryReconciliation,
}: Omit<Parameters<typeof evaluateImportSourceReadiness>[0], 'plan' | 'policy' | 'objectTypeUuid'> &
  Omit<Parameters<typeof executeImportAllSource>[0], 'plan' | 'objectTypeUuid'> & {
    plan: ImportAllSourcePlan
    policy?: ImportWorkflowPolicy
    objectTypeUuid?: string
    retryReconciliation?: { token: string; fetchExisting: ExistingDocumentFetcher }
  }): Promise<{ plan: ImportAllSourcePlan; decision: ImportAllPreparedSourceDecision }> => {
  let preparedPlan = policy.defaultConflictAction
    ? { ...plan, defaultConflictAction: policy.defaultConflictAction }
    : plan
  const retryableKeys = recordKeys
    ? getRetryableImportAllRecordKeys(preparedPlan, recordKeys, true)
    : new Set<string>()
  const readinessPlan = retryableKeys.size > 0
    ? {
      ...preparedPlan,
      executionResults: preparedPlan.executionResults.filter(({ status }) => status !== 'failed'),
    }
    : preparedPlan
  let readinessOptions = {
    plan: readinessPlan,
    policy,
    objectTypeUuid,
    schema,
    canWrite,
    canCreateType,
    inputValues,
    optedInReviewSteps,
    completedReviewSteps,
    relationshipBlockers,
  }
  let readiness = evaluateImportSourceReadiness(readinessOptions)

  if (readiness.status !== 'advance') {
    return { plan: preparedPlan, decision: { status: 'paused', readiness, reason: 'readiness' } }
  }
  if (readiness.action !== 'execute') {
    return {
      plan: preparedPlan,
      decision: {
        status: 'paused',
        readiness,
        reason: 'unsupported-stage',
        unsupportedAction: readiness.action,
      },
    }
  }

  if (retryableKeys.size > 0) {
    if (!retryReconciliation) {
      return {
        plan: preparedPlan,
        decision: {
          status: 'paused', reason: 'unsupported-stage', unsupportedAction: 'reconcile',
          readiness: { status: 'advance', action: 'reconcile' },
        },
      }
    }
    try {
      signal.throwIfAborted()
      preparedPlan = await refreshImportAllSourceReconciliation({
        plan: preparedPlan, recordKeys: retryableKeys, objectTypeUuid: objectTypeUuid!,
        token: retryReconciliation.token, signal, fetchExisting: retryReconciliation.fetchExisting,
      })
      signal.throwIfAborted()
    } catch (error) {
      if (!isExecutionAbort(error)) throw error
      return {
        plan: preparedPlan,
        decision: { status: 'executed', cancelled: true, readiness: evaluateImportSourceReadiness({ ...readinessOptions, plan: preparedPlan }) },
      }
    }
    readinessOptions = {
      ...readinessOptions,
      plan: { ...preparedPlan, executionResults: preparedPlan.executionResults.filter(({ status }) => status !== 'failed') },
    }
    readiness = evaluateImportSourceReadiness(readinessOptions)
    if (readiness.status !== 'advance') {
      return { plan: preparedPlan, decision: { status: 'paused', readiness, reason: 'readiness' } }
    }
    if (readiness.action !== 'execute') {
      return {
        plan: preparedPlan,
        decision: { status: 'paused', reason: 'unsupported-stage', unsupportedAction: readiness.action, readiness },
      }
    }
  }

  const executedPlan = await executeImportAllSource({
    plan: preparedPlan,
    objectTypeUuid: objectTypeUuid!,
    signal,
    mergeStrategy,
    persistence,
    recordKeys,
    batchSize,
    delayMsBetweenBatches,
    onProgress,
  })
  return {
    plan: executedPlan,
    decision: {
      status: 'executed',
      readiness: evaluateImportSourceReadiness({ ...readinessOptions, plan: executedPlan }),
      ...(executedPlan.executionCompleted < executedPlan.executionTotal ? { cancelled: true } : {}),
    },
  }
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
  const retryableKeys = getRetryableImportAllRecordKeys(plan, recordKeys, true)
  const records = plan.records.filter((record) => retryableKeys.has(importAllRecordKey(record)))
  const existingDocuments =
    records.length > 0 ? await fetchExisting({ records, objectTypeUuid, token, signal }) : []
  const refreshed = reconcileImportRecords(records, existingDocuments)
  const refreshedByKey = new Map(
    refreshed.map((reconciliation) => [importAllRecordKey(reconciliation.record), reconciliation])
  )
  const selectedKeys = new Set(records.map((record) => importAllRecordKey(record)))
  const existingByKey = new Map(
    plan.reconciliations.map((reconciliation) => [
      importAllRecordKey(reconciliation.record),
      reconciliation,
    ])
  )
  return {
    ...plan,
    reconciliations: plan.records.flatMap((record) => {
      const key = importAllRecordKey(record)
      if (selectedKeys.has(key)) {
        const reconciliation = refreshedByKey.get(key)
        return reconciliation ? [reconciliation] : []
      }
      const reconciliation = existingByKey.get(key)
      return reconciliation ? [reconciliation] : []
    }),
  }
}

export type ImportAllRecordValidator = (
  schema: JSONSchema6,
  record: CanonicalImportRecord
) => { isValid: boolean; errors: string[] }

export const fanOutCompositeImportCandidates = (
  candidates: ImportCandidate[],
  memberSourceIds: string[]
): Record<string, ImportCandidate[]> =>
  Object.fromEntries(
    memberSourceIds.map((sourceId) => [
      sourceId,
      candidates.map((candidate) => ({
        ...candidate,
        provenance: { ...candidate.provenance, sourceId },
      })),
    ])
  )

export const loadCompositeImportRecords = async ({
  adapter,
  candidates,
  signal,
  batchSize = 10,
  onProgress,
}: {
  adapter: ImportCompositeSourceAdapter
  candidates: ImportCandidate[]
  signal: AbortSignal
  batchSize?: number
  onProgress?: (completed: number, total: number) => void
}): Promise<Record<string, CanonicalImportRecord[]>> => {
  const recordsBySource = Object.fromEntries(
    adapter.memberSourceIds.map((sourceId) => [sourceId, [] as CanonicalImportRecord[]])
  )
  let completed = 0
  onProgress?.(0, candidates.length)
  for (let start = 0; start < candidates.length; start += Math.max(1, batchSize)) {
    if (signal.aborted) throw new DOMException('Preparation cancelled', 'AbortError')
    const batch = candidates.slice(start, start + Math.max(1, batchSize))
    const results = await Promise.all(
      batch.map((candidate) => adapter.load({ candidate, signal }))
    )
    for (const records of results) {
      for (const sourceId of adapter.memberSourceIds) {
        const record = records[sourceId]
        if (!record) throw new Error(`Composite source did not produce a record for ${sourceId}`)
        recordsBySource[sourceId].push(record)
      }
    }
    completed += batch.length
    onProgress?.(completed, candidates.length)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  return recordsBySource
}

export const prepareImportAllSource = async ({
  source,
  plan,
  schema,
  objectTypeUuid,
  token,
  signal,
  validator,
  fetchExisting,
  preloadedRecords,
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
  preloadedRecords?: CanonicalImportRecord[]
  batchSize?: number
  onProgress?: (completed: number, total: number) => void
}): Promise<ImportAllSourcePlan> => {
  try {
    let records = preloadedRecords
    if (!records) {
      const loadResults: PromiseSettledResult<CanonicalImportRecord>[] = []
      const total = plan.candidates.length
      onProgress?.(0, total)
      for (let index = 0; index < total; index += Math.max(1, batchSize)) {
        const batch = plan.candidates.slice(index, index + Math.max(1, batchSize))
        const results = await Promise.allSettled(
          batch.map((candidate) =>
            source.sourceAdapter.load({
              candidate,
              detailRoot: source.sourceAdapter.defaultDetailRoot,
              signal,
            })
          )
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

      records = loadResults.map(
        (result) => (result as PromiseFulfilledResult<CanonicalImportRecord>).value
      )
    }
    const validationResults = records.map((record) => ({
      record,
      ...(schema && validator ? validator(schema, record) : { isValid: true, errors: [] }),
    }))
    const validRecords = validationResults
      .filter(({ isValid }) => isValid)
      .map(({ record }) => record)
    const existingDocuments =
      validRecords.length > 0 && objectTypeUuid
        ? await fetchExisting({ records: validRecords, objectTypeUuid, token, signal })
        : []

    return {
      ...plan,
      preparationStatus: 'ready',
      preparationCompleted: records.length,
      preparationTotal: records.length,
      records,
      validationResults,
      validationContext: schema && validator
        ? { schema: cloneDeep(schema), objectTypeUuid, records: cloneDeep(records) }
        : undefined,
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
      validationContext: undefined,
      reconciliations: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export type ImportAllPreparationDecision =
  | { status: 'progressed'; readiness: ImportReadinessDecision }
  | {
    status: 'paused'
    reason: 'readiness'
    readiness: Exclude<ImportReadinessDecision, { status: 'advance' }>
  }
  | {
    status: 'paused'
    reason: 'unsupported-stage'
    unsupportedAction: 'create-type' | 'validate' | 'reconcile' | 'execute'
    readiness: Extract<ImportReadinessDecision, { status: 'advance' }>
  }
  | { status: 'paused'; reason: 'type-creation'; error?: string; cancelled?: boolean }

export const progressImportAllSourcePreparation = async ({
  source,
  plan,
  preloadedRecords,
  policy = {},
  objectTypeUuid,
  schema,
  canWrite,
  canCreateType,
  inputValues,
  optedInReviewSteps,
  completedReviewSteps = [],
  relationshipBlockers,
  token,
  signal,
  validator,
  createTypeIfMissing,
  fetchExisting,
  batchSize,
  onProgress,
}: {
  source: ImportAllPlanSource
  plan: ImportAllSourcePlan
  preloadedRecords?: CanonicalImportRecord[]
  policy?: ImportWorkflowPolicy
  objectTypeUuid?: string
  schema?: JSONSchema6
  canWrite: boolean
  canCreateType?: boolean
  inputValues?: Record<string, unknown>
  optedInReviewSteps?: ImportReviewStep[]
  completedReviewSteps?: ImportReviewStep[]
  relationshipBlockers?: readonly string[]
  token: string
  signal: AbortSignal
  validator?: ImportAllRecordValidator
  createTypeIfMissing?: (options: {
    source: ImportAllPlanSource
    plan: ImportAllSourcePlan
    schema?: JSONSchema6
    token: string
    signal: AbortSignal
  }) => Promise<{ objectTypeUuid: string; schema: JSONSchema6 }>
  fetchExisting: ExistingDocumentFetcher
  batchSize?: number
  onProgress?: (completed: number, total: number) => void
}): Promise<{
  plan: ImportAllSourcePlan
  decision: ImportAllPreparationDecision
  invalidatedReviewSteps: ImportReviewStep[]
  completedReviewSteps: ImportReviewStep[]
  objectTypeUuid?: string
  schema?: JSONSchema6
}> => {
  let effectiveObjectTypeUuid = objectTypeUuid
  let effectiveSchema = schema ?? source.sourceAdapter.schema
  const incomingRecords = preloadedRecords ?? plan.records
  const recordsChanged = plan.preparationStatus === 'ready' &&
    (!isEqual(plan.records, incomingRecords) ||
      (plan.validationContext !== undefined && !isEqual(plan.validationContext.records, incomingRecords)))
  const typeSchemaChanged = plan.validationContext !== undefined &&
    (plan.validationContext.objectTypeUuid !== effectiveObjectTypeUuid ||
      !isEqual(plan.validationContext.schema, effectiveSchema))
  const validationContextChanged = plan.validationContext !== undefined &&
    (typeSchemaChanged || !isEqual(plan.validationContext.records, incomingRecords))
  const invalidatedReviewSteps = [
    ...(recordsChanged ? ['mapping', 'overrides', 'review', 'relationships'] as const : []),
    ...(typeSchemaChanged ? ['type-schema', 'review', 'relationships'] as const : []),
  ].filter((step, index, steps) => steps.indexOf(step) === index)
  let currentCompletedReviewSteps = completedReviewSteps.filter(
    (step) => !invalidatedReviewSteps.includes(step)
  )
  const evidenceChanged = recordsChanged || validationContextChanged
  const currentPlan = evidenceChanged ? {
    ...plan,
    records: incomingRecords,
    validationContext: undefined,
    validationResults: [],
    reconciliations: [],
  } : plan
  const readinessOptions = {
    plan: currentPlan,
    policy,
    objectTypeUuid: effectiveObjectTypeUuid,
    schema: effectiveSchema,
    canWrite,
    canCreateType,
    inputValues,
    optedInReviewSteps,
    completedReviewSteps: currentCompletedReviewSteps,
    relationshipBlockers,
  }
  let readiness = evaluateImportSourceReadiness(readinessOptions)
  const result = (nextPlan: ImportAllSourcePlan, decision: ImportAllPreparationDecision) => ({
    plan: nextPlan,
    decision,
    invalidatedReviewSteps,
    completedReviewSteps: currentCompletedReviewSteps,
    objectTypeUuid: effectiveObjectTypeUuid,
    schema: effectiveSchema,
  })
  if (readiness.status !== 'advance') {
    return result(currentPlan, { status: 'paused', reason: 'readiness', readiness })
  }
  const requestedAction = readiness.action
  if (requestedAction === 'create-type' && createTypeIfMissing) {
    if (signal.aborted) {
      return result(currentPlan, { status: 'paused', reason: 'type-creation', cancelled: true })
    }
    try {
      const created = await createTypeIfMissing({
        source,
        plan: currentPlan,
        schema: effectiveSchema,
        token,
        signal,
      })
      if (!created.objectTypeUuid || !created.schema) {
        throw new Error('Type creation did not return an object type and schema.')
      }
      effectiveObjectTypeUuid = created.objectTypeUuid
      effectiveSchema = schema ?? source.sourceAdapter.schema ?? created.schema
      const typeWasUpdated = objectTypeUuid !== effectiveObjectTypeUuid
      const schemaWasUpdated = !isEqual(schema ?? source.sourceAdapter.schema, effectiveSchema)
      const creationInvalidations = typeWasUpdated || schemaWasUpdated
        ? ['type-schema', 'review', 'relationships'] as ImportReviewStep[]
        : []
      const returnedInvalidations = [...new Set([...invalidatedReviewSteps, ...creationInvalidations])]
      const returnedCompletedReviewSteps = completedReviewSteps.filter(
        (step) => !returnedInvalidations.includes(step)
      )
      if (signal.aborted) {
        return {
          ...result(currentPlan, { status: 'paused', reason: 'type-creation', cancelled: true }),
          invalidatedReviewSteps: returnedInvalidations,
          completedReviewSteps: returnedCompletedReviewSteps,
        }
      }
      const nextReadiness = evaluateImportSourceReadiness({
        ...readinessOptions,
        objectTypeUuid: effectiveObjectTypeUuid,
        schema: effectiveSchema,
        completedReviewSteps: returnedCompletedReviewSteps,
      })
      return {
        plan: currentPlan,
        decision: nextReadiness.status === 'advance'
          ? { status: 'progressed' as const, readiness: nextReadiness }
          : { status: 'paused' as const, reason: 'readiness' as const, readiness: nextReadiness },
        invalidatedReviewSteps: returnedInvalidations,
        completedReviewSteps: returnedCompletedReviewSteps,
        objectTypeUuid: effectiveObjectTypeUuid,
        schema: effectiveSchema,
      }
    } catch (error) {
      return result(currentPlan, signal.aborted
        ? { status: 'paused', reason: 'type-creation', cancelled: true }
        : {
          status: 'paused',
          reason: 'type-creation',
          error: error instanceof Error ? error.message : String(error),
        })
    }
  }
  if (requestedAction === 'create-type' || requestedAction === 'execute') {
    return result(currentPlan, {
      status: 'paused',
      reason: 'unsupported-stage',
      unsupportedAction: requestedAction,
      readiness: { status: 'advance', action: requestedAction },
    })
  }
  if (requestedAction === 'validate' && !validator) {
    return result(currentPlan, {
      status: 'paused',
      reason: 'unsupported-stage',
      unsupportedAction: 'validate',
      readiness: { status: 'advance', action: 'validate' },
    })
  }

  let updatedPlan: ImportAllSourcePlan
  if (requestedAction === 'reconcile' && !evidenceChanged) {
    updatedPlan = await refreshImportAllSourceReconciliation({
      plan: currentPlan,
      recordKeys: new Set(currentPlan.records.map(importAllRecordKey)),
      objectTypeUuid: objectTypeUuid!,
      token,
      signal,
      fetchExisting,
    })
  } else {
    updatedPlan = await prepareImportAllSource({
      source,
      plan: currentPlan,
      preloadedRecords: requestedAction === 'prepare' ? preloadedRecords : incomingRecords,
      schema: effectiveSchema,
      objectTypeUuid: effectiveObjectTypeUuid,
      token,
      signal,
      validator,
      fetchExisting,
      batchSize,
      onProgress,
    })
  }

  if (plan.validationContext && !isEqual(plan.validationContext.records, updatedPlan.records)) {
    for (const step of ['mapping', 'overrides', 'review', 'relationships'] as const) {
      if (!invalidatedReviewSteps.includes(step)) invalidatedReviewSteps.push(step)
    }
    currentCompletedReviewSteps = currentCompletedReviewSteps.filter(
      (step) => !invalidatedReviewSteps.includes(step)
    )
  }
  readiness = evaluateImportSourceReadiness({
    ...readinessOptions,
    plan: updatedPlan,
    objectTypeUuid: effectiveObjectTypeUuid,
    schema: effectiveSchema,
    completedReviewSteps: currentCompletedReviewSteps,
  })
  if (readiness.status === 'advance' &&
    (readiness.action === 'create-type' || readiness.action === 'validate' ||
      readiness.action === 'reconcile' || readiness.action === 'execute')) {
    return result(updatedPlan, {
      status: 'paused',
      reason: 'unsupported-stage',
      unsupportedAction: readiness.action,
      readiness,
    })
  }
  if (readiness.status !== 'advance') {
    return result(updatedPlan, { status: 'paused', reason: 'readiness', readiness })
  }
  return result(updatedPlan, { status: 'progressed', readiness })
}

export const summarizeImportAllPlan = (plans: ImportAllSourcePlan[]) => ({
  enabledSources: plans.filter((plan) => plan.enabled).length,
  readySources: plans.filter((plan) => plan.enabled && plan.status === 'ready').length,
  failedSources: plans.filter((plan) => plan.enabled && plan.status === 'error').length,
  preparedSources: plans.filter((plan) => plan.enabled && plan.preparationStatus === 'ready')
    .length,
  preparationErrors: plans.filter((plan) => plan.enabled && plan.preparationStatus === 'error')
    .length,
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
    (total, plan) =>
      total +
      plan.reconciliations.filter(
        ({ status }) => status === 'conflicting' || status === 'ambiguous'
      ).length,
    0
  ),
})
