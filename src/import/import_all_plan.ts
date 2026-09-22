import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from ***REMOVED***./types***REMOVED***
import type { ImportReconciliation } from ***REMOVED***./reconciliation***REMOVED***
import { reconcileImportRecords } from ***REMOVED***./reconciliation***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import {
  mergeIncomingNonEmpty,
  withImportProvenance,
  type ImportConflictAction,
  type ImportMergeStrategy,
} from ***REMOVED***./reconciliation***REMOVED***
import type {
  ImportRelationshipPersistenceResult,
  ImportRelationshipPlan,
} from ***REMOVED***./relationship_planning***REMOVED***
import { relationshipDocumentKey } from ***REMOVED***./relationship_planning***REMOVED***

export type ImportAllDiscoveryStatus = ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***ready***REMOVED*** | ***REMOVED***error***REMOVED***
export type ImportAllPreparationStatus = ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***ready***REMOVED*** | ***REMOVED***error***REMOVED***
export type ImportAllExecutionStatus = ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***ready***REMOVED*** | ***REMOVED***error***REMOVED***

export type ImportAllExecutionResult = {
  recordKey: string
  action?: ImportConflictAction
  status: ***REMOVED***imported***REMOVED*** | ***REMOVED***ignored***REMOVED*** | ***REMOVED***blocked***REMOVED*** | ***REMOVED***failed***REMOVED***
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
  defaultConflictAction: Exclude<ImportConflictAction, ***REMOVED***create***REMOVED***>
  conflictActions: Record<string, Exclude<ImportConflictAction, ***REMOVED***create***REMOVED***>>
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

export type ImportAllError = {
  sourceId: string
  sourceLabel: string
  scope: ***REMOVED***source***REMOVED*** | ***REMOVED***validation***REMOVED*** | ***REMOVED***document***REMOVED*** | ***REMOVED***relationship***REMOVED***
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
        scope: plan.preparationStatus === ***REMOVED***error***REMOVED*** ? ***REMOVED***source***REMOVED*** : ***REMOVED***source***REMOVED***,
        message: plan.error,
      })
    }
    for (const result of plan.validationResults) {
      if (!result.isValid) {
        errors.push({
          sourceId: plan.sourceId,
          sourceLabel: plan.label,
          scope: ***REMOVED***validation***REMOVED***,
          recordKey: importAllRecordKey(result.record),
          message: result.errors.join(***REMOVED***; ***REMOVED***) || ***REMOVED***Record failed validation.***REMOVED***,
        })
      }
    }
    for (const result of plan.executionResults) {
      if (result.status === ***REMOVED***failed***REMOVED***) {
        errors.push({
          sourceId: plan.sourceId,
          sourceLabel: plan.label,
          scope: ***REMOVED***document***REMOVED***,
          recordKey: result.recordKey,
          message: result.error || ***REMOVED***Document import failed.***REMOVED***,
        })
      }
    }
  }

  for (const plan of relationshipPlans) {
    if (plan.status === ***REMOVED***ready***REMOVED***) continue
    const sourcePlan = sourceByType.get(plan.child.objectTypeSlug)
    errors.push({
      sourceId: plan.child.record.provenance.sourceId,
      sourceLabel: sourcePlan?.label ?? plan.child.objectTypeSlug,
      scope: ***REMOVED***relationship***REMOVED***,
      recordKey: importAllRecordKey(plan.child.record),
      message: plan.reason || `Relationship is ${plan.status}.`,
    })
  }

  for (const result of relationshipResults) {
    if (result.status === ***REMOVED***failed***REMOVED*** || result.status === ***REMOVED***blocked***REMOVED***) {
      errors.push({
        sourceId: result.relationshipKey.split(***REMOVED***:***REMOVED***)[1] ?? ***REMOVED***relationship***REMOVED***,
        sourceLabel: ***REMOVED***Relationship***REMOVED***,
        scope: ***REMOVED***relationship***REMOVED***,
        recordKey: result.relationshipKey,
        message: result.error || ***REMOVED***Relationship write failed.***REMOVED***,
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
  status: ***REMOVED***idle***REMOVED***,
  preparationStatus: ***REMOVED***idle***REMOVED***,
  preparationCompleted: 0,
  preparationTotal: 0,
  executionStatus: ***REMOVED***idle***REMOVED***,
  defaultConflictAction: ***REMOVED***ignore***REMOVED***,
  conflictActions: {},
  candidates: [],
  records: [],
  validationResults: [],
  reconciliations: [],
  executionResults: [],
})

export const importAllRecordKey = (record: CanonicalImportRecord): string =>
  `${record.provenance.sourceId}:${record.provenance.externalId}`

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
    document: Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
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
  console.log(***REMOVED***[Import All] document execution started***REMOVED***, {
    sourceId: plan.sourceId,
    type: plan.type,
    records: plan.records.length,
    reconciliations: plan.reconciliations.length,
    objectTypeUuid,
  })
  // Intentional breakpoint for live Import All execution diagnostics.
  // eslint-disable-next-line no-debugger
  debugger;
  const validationByKey = new Map(
    plan.validationResults.map((result) => [importAllRecordKey(result.record), result])
  )
  const results: ImportAllExecutionResult[] = []

  for (const reconciliation of plan.reconciliations) {
    if (signal.aborted) throw new DOMException(***REMOVED***Execution cancelled***REMOVED***, ***REMOVED***AbortError***REMOVED***)
    const recordKey = importAllRecordKey(reconciliation.record)
    if (recordKeys && !recordKeys.has(recordKey)) continue
    const validation = validationByKey.get(recordKey)
    if (!validation?.isValid || reconciliation.status === ***REMOVED***ambiguous***REMOVED***) {
      results.push({ recordKey, status: ***REMOVED***blocked***REMOVED***, action: reconciliation.action })
      continue
    }

    const action =
      reconciliation.status === ***REMOVED***new***REMOVED***
        ? ***REMOVED***create***REMOVED***
        : reconciliation.status === ***REMOVED***exact***REMOVED***
          ? ***REMOVED***ignore***REMOVED***
          : (plan.conflictActions[recordKey] ?? plan.defaultConflictAction)
    console.log(***REMOVED***[Import All] document action selected***REMOVED***, {
      sourceId: plan.sourceId,
      recordKey,
      slug: reconciliation.record.slug,
      reconciliationStatus: reconciliation.status,
      action,
      existingUuid: reconciliation.existingDocuments[0]?.uuid,
    })
    if (action === ***REMOVED***ignore***REMOVED***) {
      results.push({
        recordKey,
        action,
        status: ***REMOVED***ignored***REMOVED***,
        documentUuid: reconciliation.existingDocuments[0]?.uuid,
      })
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
      } as Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>

      if (action === ***REMOVED***create***REMOVED***) {
        console.log(***REMOVED***[Import All] checking for late document conflict***REMOVED***, {
          sourceId: plan.sourceId,
          recordKey,
          slug: record.slug,
          objectTypeUuid,
        })
        const existing = await persistence.fetchBySlug(record.slug, objectTypeUuid, signal)
        if (existing)
          throw new Error(`Document "${record.slug}" already exists. Return to duplicate check.`)
        console.log(***REMOVED***[Import All] about to POST document***REMOVED***, {
          sourceId: plan.sourceId,
          recordKey,
          slug: record.slug,
          objectTypeUuid,
        })
        // Intentional breakpoint immediately before document creation.
        // eslint-disable-next-line no-debugger
        debugger;
        const created = await persistence.post(incomingDocument, signal)
        results.push({ recordKey, action, status: ***REMOVED***imported***REMOVED***, documentUuid: created.uuid })
      } else {
        const existing = reconciliation.existingDocuments[0]
        if (!existing) throw new Error(***REMOVED***Existing document was not found***REMOVED***)
        const document =
          action === ***REMOVED***merge***REMOVED***
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
        if (action === ***REMOVED***merge***REMOVED*** && mergeStrategy === ***REMOVED***postgrest-rpc***REMOVED***) {
          await persistence.mergeRpc(existing.uuid, document, signal)
        } else {
          await persistence.patch(existing.uuid, document, signal)
        }
        results.push({ recordKey, action, status: ***REMOVED***imported***REMOVED***, documentUuid: existing.uuid })
      }
    } catch (error) {
      results.push({
        recordKey,
        action,
        status: ***REMOVED***failed***REMOVED***,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { ...plan, executionStatus: ***REMOVED***ready***REMOVED***, executionResults: results }
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
      preparationStatus: ***REMOVED***ready***REMOVED***,
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
      preparationStatus: ***REMOVED***error***REMOVED***,
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
  readySources: plans.filter((plan) => plan.enabled && plan.status === ***REMOVED***ready***REMOVED***).length,
  failedSources: plans.filter((plan) => plan.enabled && plan.status === ***REMOVED***error***REMOVED***).length,
  preparedSources: plans.filter((plan) => plan.enabled && plan.preparationStatus === ***REMOVED***ready***REMOVED***)
    .length,
  preparationErrors: plans.filter((plan) => plan.enabled && plan.preparationStatus === ***REMOVED***error***REMOVED***)
    .length,
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
    (total, plan) =>
      total +
      plan.reconciliations.filter(
        ({ status }) => status === ***REMOVED***conflicting***REMOVED*** || status === ***REMOVED***ambiguous***REMOVED***
      ).length,
    0
  ),
})
