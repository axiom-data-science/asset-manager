import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Check, CircleAlert, FileSpreadsheet, LoaderCircle, Search, ShieldCheck, Square, X } from 'lucide-react'
import { Checkbox, Input, Tabs } from '@axdspub/axiom-ui-utilities'
import { schemaToFormUtils, type IFormValues } from '@axdspub/axiom-ui-forms'
import { Button } from '@/components/ui/button'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import importConfigs from '../config'
import type {
  CanonicalImportRecord,
  ImportReviewStep,
  ImportSourceAdapter,
  ImportWorkflowMode,
} from '../types'
import type { IImportPageProps } from './import_records_page_impl'
import {
  createImportAllSourcePlan,
  collectImportDocumentUuids,
  collectImportAllErrors,
  discoverImportAllSource,
  evaluateImportSourceReadiness,
  executePreparedImportAllSource,
  fanOutCompositeImportCandidates,
  formatUnmatchedArrayRowsError,
  importAllRecordKey,
  importAllReadinessMessage,
  loadCompositeImportRecords,
  mergeImportAllExecutionPlan,
  mergeArraySourceRecordsIntoParentRecords,
  prepareImportAllSource,
  progressImportAllSourcePreparation,
  summarizeImportAllPlan,
  type ImportAllPlanSource,
  type ImportAllSourcePlan,
} from '../import_all_plan'
import { fetchExistingImportDocuments } from '../reconciliation_service'
import { getDocumentImportProvenance } from '../reconciliation'
import { useAuth } from '@/auth/useAuth'
import { omit } from 'lodash-es'
import type { JSONSchema6 } from 'json-schema'
import { postDocument, patchDocument } from '@/manage/document/services'
import { fetchObjectTypes } from '@/manage/object_type/services'
import { fetchObjectSchemas } from '@/manage/object_schema/services'
import { mergeImportDocumentViaRpc, fetchExistingDocumentBySlug } from '../reconciliation_service'
import {
  IMPORT_FAIL_RELATIONSHIP_ONCE,
  IMPORT_MERGE_RPC,
  IMPORT_RELATIONSHIP_TEST_CHILD_SLUG,
  IMPORT_RELATIONSHIP_TEST_MODE,
  IMPORT_RELATIONSHIP_TEST_PARENT_SLUG,
} from '@/config/config'
import {
  persistImportRelationships,
  planImportRelationships,
  relationshipDocumentKey,
  importRelationshipKey,
  type ImportRelationshipPersistenceResult,
  type ImportRelationshipPlan,
} from '../relationship_planning'
import { postRelationship } from '@/manage/relationship/services'
import { fetchRelationships } from '@/manage/relationship/services'
import { TableVirtuoso } from 'react-virtuoso'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CreateObjectType from '@/manage/object_type/create'
import { SelectObjectTypeForImportTab } from './select_object_type_for_import'
import { requestContextReloadAtom } from '@/state/contextStateAtom'
import { useImportSession } from '@/import/state/importState'
import { uploadedImportSourcesAtom } from '@/import/state/uploadedImportSources'
import { createImportAllTypeCreationAdapter } from '../create_import_object_type'
import { ImportWizard } from '../components/import_wizard'

const allConfiguredSources = importConfigs.filter(
  (config): config is IImportPageProps & { sourceAdapter: ImportSourceAdapter } =>
    config.sourceAdapter !== undefined
)
const configuredSources = allConfiguredSources.filter(
  (source) => source.includeInImportAll !== false
)

const compositeSourceGroups = allConfiguredSources.filter(
  (source) => source.compositeSourceAdapter !== undefined
)
const compositeSourceByMemberId = new Map(
  compositeSourceGroups.flatMap((source) =>
    source.compositeSourceAdapter!.memberSourceIds.map((sourceId) => [sourceId, source] as const)
  )
)
const initialPlans = (sources: ImportAllPlanSource[]): Record<string, ImportAllSourcePlan> =>
  Object.fromEntries(
    sources.map((source) => [
      source.sourceAdapter.id,
      createImportAllSourcePlan(source),
    ])
  )

const statusIcon = (status: ImportAllSourcePlan['status']) => {
  if (status === 'loading') return <LoaderCircle className="animate-spin" size={16} />
  if (status === 'ready') return <Check className="text-green-700" size={16} />
  if (status === 'error') return <CircleAlert className="text-red-700" size={16} />
  return <Square className="text-gray-400" size={14} />
}

const ImportActivity = ({ plan }: { plan: ImportAllSourcePlan }): ReactElement => {
  const recordsByKey = new Map(plan.records.map((record) => [importAllRecordKey(record), record]))
  const validationByKey = new Map(
    plan.validationResults.map((result) => [importAllRecordKey(result.record), result])
  )
  const reconciliationByKey = new Map(
    plan.reconciliations.map((reconciliation) => [
      importAllRecordKey(reconciliation.record),
      reconciliation,
    ])
  )
  const executionByKey = new Map(plan.executionResults.map((result) => [result.recordKey, result]))

  return (
    <div className="border bg-white p-2 text-sm shadow-sm">
      <div className="max-h-72 overflow-y-auto">
        {plan.candidates.length === 0 ? (
          <span className="text-gray-500">Waiting for discovery...</span>
        ) : (
          plan.candidates.map((candidate) => {
            const key = `${candidate.provenance.sourceId}:${candidate.provenance.externalId}`
            const record = recordsByKey.get(key)
            const validation = validationByKey.get(key)
            const reconciliation = reconciliationByKey.get(key)
            const execution = executionByKey.get(key)
            const uuid = execution?.documentUuid ?? reconciliation?.existingDocuments[0]?.uuid
            const documentLink =
              uuid ??
              (execution?.status === 'failed' ? (record?.slug ?? candidate.slug) : undefined)
            const status = execution
              ? execution.status
              : validation && !validation.isValid
                ? 'invalid'
                : reconciliation?.status === 'conflicting'
                  ? 'changed'
                  : record
                    ? 'loaded'
                    : 'discovered'

            return (
              <div key={key} className="border-b py-1.5 last:border-b-0">
                <div className="truncate font-medium">{candidate.label}</div>
                <div className="flex items-start justify-between gap-2 text-xs text-gray-600">
                  <span>{status}</span>
                  {documentLink && execution && execution.status !== 'blocked' && (
                    <Link
                      className="shrink-0 text-blue-700 hover:underline"
                      to={`/document/edit/${documentLink}`}
                    >
                      Open document
                    </Link>
                  )}
                </div>
                {execution?.error && <div className="text-xs text-red-700">{execution.error}</div>}
                {validation && !validation.isValid && (
                  <div className="text-xs text-red-700">{validation.errors.join('; ')}</div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const validateRecord = (schema: JSONSchema6, record: ImportAllSourcePlan['records'][number]) => {
  const errors = schemaToFormUtils.validateAgainstSchema(
    omit(schema as Record<string, unknown>, '$schema'),
    record.data as IFormValues
  )
  return {
    isValid: !errors?.length,
    errors: errors?.map((error) => error.message) ?? [],
  }
}

const createAutomaticType = createImportAllTypeCreationAdapter()

export type ImportAllRuntime = {
  fetchExistingImportDocuments: typeof fetchExistingImportDocuments
  fetchObjectTypes: typeof fetchObjectTypes
  fetchObjectSchemas: typeof fetchObjectSchemas
  postDocument: typeof postDocument
  patchDocument: typeof patchDocument
  mergeImportDocumentViaRpc: typeof mergeImportDocumentViaRpc
  fetchExistingDocumentBySlug: typeof fetchExistingDocumentBySlug
  postRelationship: typeof postRelationship
  fetchRelationships: typeof fetchRelationships
  createAutomaticType: typeof createAutomaticType
  requestContextReload: () => void
}

const productionRuntime: Omit<ImportAllRuntime, 'requestContextReload'> = {
  fetchExistingImportDocuments,
  fetchObjectTypes,
  fetchObjectSchemas,
  postDocument,
  patchDocument,
  mergeImportDocumentViaRpc,
  fetchExistingDocumentBySlug,
  postRelationship,
  fetchRelationships,
  createAutomaticType,
}

const TypeSetupDialog = ({
  source,
  plan,
  open,
  onOpenChange,
  onCreateAutomatically,
  canWrite,
  requestContextReload,
  allowManualTypeSetup,
}: {
  source: ImportAllPlanSource
  plan: ImportAllSourcePlan
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAutomatically: () => Promise<boolean>
  canWrite: boolean
  requestContextReload: () => void
  allowManualTypeSetup: boolean
}): ReactElement => {
  const { session } = useImportSession(plan.sourceId)
  const [automaticCreateState, setAutomaticCreateState] = useState<'idle' | 'creating' | 'error'>(
    'idle'
  )
  const [automaticCreateError, setAutomaticCreateError] = useState<string | undefined>()

  const createAutomaticTypeForSource = async () => {
    if (!plan.records.length || !canWrite) return
    setAutomaticCreateState('creating')
    setAutomaticCreateError(undefined)
    try {
      if (!await onCreateAutomatically()) {
        throw new Error('Type setup did not finish. Close this dialog to view the preparation error.')
      }
      onOpenChange(false)
    } catch (error) {
      setAutomaticCreateState('error')
      setAutomaticCreateError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none sm:max-w-none flex-col overflow-auto">
        <DialogHeader>
          <DialogTitle>Set up {source.label}</DialogTitle>
          <DialogDescription>
            Select an existing type or create one from the prepared records.
          </DialogDescription>
        </DialogHeader>
        <div className={`grid min-h-0 gap-6 ${allowManualTypeSetup ? 'lg:grid-cols-2' : ''}`}>
          {allowManualTypeSetup && (
            <section className="min-h-0 overflow-auto border p-4">
              <h2 className="mb-3 font-medium">Select or infer a type</h2>
              <div className="mb-4 border bg-gray-50 p-3 text-xs text-gray-700">
                <strong>{plan.records.length} prepared records</strong>
                {plan.records.length > 0 && (
                  <ul className="mt-2 max-h-28 overflow-auto">
                    {plan.records.slice(0, 10).map((record) => (
                      <li key={record.provenance.externalId} className="truncate">
                        {record.label} ({record.slug})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <SelectObjectTypeForImportTab
                documents={plan.records}
                type={source.type}
                sourceId={plan.sourceId}
              />
            </section>
          )}
          <section className="min-h-0 overflow-auto border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-medium">Create a new type</h2>
              <Button
                size="xs"
                disabled={!session.schema || automaticCreateState === 'creating'}
                onClick={() => void createAutomaticTypeForSource()}
              >
                {automaticCreateState === 'creating' ? 'Creating...' : 'Create automatically'}
              </Button>
            </div>
            {automaticCreateError && (
              <div className="mb-3 text-sm text-red-700" role="alert">
                {automaticCreateError}
              </div>
            )}
            {allowManualTypeSetup && session.schema ? (
              <CreateObjectType
                initialSchema={session.schema}
                initialLabel={source.label}
                onSuccess={() => {
                  requestContextReload()
                  onOpenChange(false)
                }}
              />
            ) : allowManualTypeSetup ? (
              <p className="text-sm text-gray-600">
                Select or infer a schema first. The type form will appear here when a schema is
                ready.
              </p>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ImportAllPageOptions = {
  sourceIds?: string[]
  pageTitle?: string
  configuredSourceOverrides?: (IImportPageProps & { sourceAdapter: ImportSourceAdapter })[]
}

export const ImportAllView = ({
  sourceIds,
  pageTitle = 'Import All Sources',
  configuredSourceOverrides,
  token,
  canWrite,
  runtime,
  includeUploadedSources = sourceIds === undefined,
  allowManualTypeSetup = true,
}: ImportAllPageOptions & {
  token: string
  canWrite: boolean
  runtime: ImportAllRuntime
  includeUploadedSources?: boolean
  allowManualTypeSetup?: boolean
}): ReactElement => {
  const [context] = useAtom(contextStateAtom)
  const [uploadedSources] = useAtom(uploadedImportSourcesAtom)
  const pageConfiguredSources = useMemo(
    () => configuredSourceOverrides ?? (sourceIds
      ? allConfiguredSources.filter((source) => sourceIds.includes(source.sourceAdapter.id))
      : configuredSources),
    [configuredSourceOverrides, sourceIds]
  )
  const allSources = useMemo(
    () => [
      ...pageConfiguredSources,
      ...(includeUploadedSources
        ? uploadedSources.map((source) => ({ ...source, icon: FileSpreadsheet }))
        : []),
    ],
    [includeUploadedSources, pageConfiguredSources, uploadedSources]
  )
  const sourcesById = useMemo(
    () => Object.fromEntries(allSources.map((source) => [source.sourceAdapter.id, source])),
    [allSources]
  )
  const [plans, setPlans] = useState(() => initialPlans(allSources))
  const [workflowMode, setWorkflowMode] = useState<ImportWorkflowMode>('interactive')
  const [readinessPauses, setReadinessPauses] = useState<Record<string, string>>({})
  const [reviewAcknowledgmentVersion, setReviewAcknowledgmentVersion] = useState(0)
  useEffect(() => {
    setPlans((current) =>
      Object.fromEntries(
        allSources.map((source) => [
          source.sourceAdapter.id,
          current[source.sourceAdapter.id] ?? createImportAllSourcePlan(source),
        ])
      )
    )
  }, [allSources])
  const [loadAllRecords, setLoadAllRecords] = useState(false)
  const [recordLimit, setRecordLimit] = useState(100)
  const [relationshipResults, setRelationshipResults] = useState<
    ImportRelationshipPersistenceResult[]
  >([])
  const [relationshipProgress, setRelationshipProgress] = useState({ completed: 0, total: 0 })
  const [isPersistingRelationships, setIsPersistingRelationships] = useState(false)
  const [typeSetupSourceId, setTypeSetupSourceId] = useState<string | null>(null)
  const [isCreatingMissingTypes, setIsCreatingMissingTypes] = useState(false)
  const [missingTypeCreationError, setMissingTypeCreationError] = useState<string>()
  const [activeView, setActiveView] = useState<'plan' | 'errors'>('plan')
  const [activeWizardStep, setActiveWizardStep] = useState('discover')
  const relationshipRetryRef = useRef<{
    plans: ImportRelationshipPlan[]
    documentUuids: Map<string, string>
    predicateUuids: Map<string, string>
  } | null>(null)
  const relationshipFailureInjectedRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const operationGenerationRef = useRef(0)
  const completedPreparationReviewsRef = useRef<Record<string, ImportReviewStep[]>>({})

  const shouldInjectRelationshipFailure = () => {
    if (!IMPORT_FAIL_RELATIONSHIP_ONCE || relationshipFailureInjectedRef.current) return false
    relationshipFailureInjectedRef.current = true
    return true
  }

  const planList = useMemo(() => Object.values(plans), [plans])
  const summary = useMemo(() => summarizeImportAllPlan(planList), [planList])
  const buildRelationshipPlans = useCallback((sourcePlans: ImportAllSourcePlan[]) => {
    const rules = sourcePlans
      .filter(({ enabled }) => enabled)
      .flatMap(({ sourceId }) => sourcesById[sourceId]?.sourceAdapter.relationshipRules ?? [])
    return planImportRelationships({
        parentObjectTypes: new Map(
          Object.values(context.object_type_by_slug).map((objectType) => [
            objectType.uuid,
            objectType,
          ])
        ),
        relationshipRules: rules,
        candidates: sourcePlans.flatMap((plan) => {
          const objectType = context.object_type_by_slug[plan.type]
          return objectType
            ? plan.records.map((record) => {
              const isOikosParent = objectType.slug === 'oikos_model'
              const isOikosChild = objectType.slug === 'oikos_model_variable'
              const shouldOverrideParent =
                isOikosParent &&
                (IMPORT_RELATIONSHIP_TEST_MODE === 'match' ||
                  IMPORT_RELATIONSHIP_TEST_MODE === 'ambiguous-parent')
              const shouldOverrideChild =
                isOikosChild &&
                (IMPORT_RELATIONSHIP_TEST_MODE === 'match' ||
                  IMPORT_RELATIONSHIP_TEST_MODE === 'missing-parent' ||
                  IMPORT_RELATIONSHIP_TEST_MODE === 'ambiguous-parent')
              const recordData =
                record.data !== null && typeof record.data === 'object'
                  ? record.data as Record<string, unknown>
                  : {}
              const data =
                shouldOverrideParent || shouldOverrideChild
                  ? {
                    ...recordData,
                    ...(shouldOverrideParent
                      ? { slug: IMPORT_RELATIONSHIP_TEST_PARENT_SLUG }
                      : {}),
                    ...(shouldOverrideChild
                      ? {
                        modelSlug:
                          IMPORT_RELATIONSHIP_TEST_MODE === 'missing-parent'
                            ? IMPORT_RELATIONSHIP_TEST_CHILD_SLUG
                            : IMPORT_RELATIONSHIP_TEST_PARENT_SLUG,
                      }
                      : {}),
                  }
                  : record.data
              return {
                record: data === record.data ? record : { ...record, data },
                objectTypeUuid: objectType.uuid,
                objectTypeSlug: objectType.slug,
              }
            })
            : []
        }),
      })
  }, [context.object_type_by_slug, sourcesById])
  const relationshipPlans = useMemo(
    () => buildRelationshipPlans(planList),
    [buildRelationshipPlans, planList]
  )
  const importErrors = useMemo(
    () =>
      collectImportAllErrors({
        plans: planList,
        relationshipPlans,
        relationshipResults,
      }),
    [planList, relationshipPlans, relationshipResults]
  )
  const isDiscovering = planList.some(({ status }) => status === 'loading')
  const isPreparing = planList.some(({ preparationStatus }) => preparationStatus === 'loading')
  const isExecuting = planList.some(({ executionStatus }) => executionStatus === 'loading')
  const isImportActive = isDiscovering || isPreparing || isExecuting || isPersistingRelationships || isCreatingMissingTypes
  const enabledPlans = planList.filter(({ enabled }) => enabled)
  const typeSetupPlan = typeSetupSourceId ? plans[typeSetupSourceId] : undefined
  const typeSetupSource = typeSetupSourceId ? sourcesById[typeSetupSourceId] : undefined
  const allSourcesSelected = planList.length > 0 && enabledPlans.length === planList.length
  const preparationProgress = useMemo(() => {
    const preparingPlans = planList.filter(
      ({ preparationStatus }) => preparationStatus === 'loading'
    )
    return {
      sources: preparingPlans.length,
      completed: preparingPlans.reduce((total, plan) => total + plan.preparationCompleted, 0),
      total: preparingPlans.reduce((total, plan) => total + plan.preparationTotal, 0),
    }
  }, [planList])
  const executionProgress = useMemo(() => {
    const executingPlans = planList.filter(({ executionTotal }) => executionTotal > 0)
    return {
      completed: executingPlans.reduce((total, plan) => total + plan.executionCompleted, 0),
      total: executingPlans.reduce((total, plan) => total + plan.executionTotal, 0),
    }
  }, [planList])
  const missingTypes = enabledPlans.filter((plan) => !context.object_type_by_slug[plan.type])
  const missingSchemas = enabledPlans.filter((plan) => {
    const objectType = context.object_type_by_slug[plan.type]
    return objectType && !context.object_schema_defaults_by_object_type_uuid[objectType.uuid]
  })
  const discoveryReady =
    enabledPlans.length > 0 && enabledPlans.every(({ status }) => status === 'ready')
  const reviewReady =
    discoveryReady &&
    enabledPlans.every(({ preparationStatus }) => preparationStatus === 'ready') &&
    missingTypes.length === 0 &&
    missingSchemas.length === 0
  const reviewHasIssues =
    summary.invalidRecords > 0 ||
    summary.conflicts > 0 ||
    relationshipPlans.some(({ status }) => status !== 'ready') ||
    importErrors.length > 0
  const hasExecutionAttempts =
    enabledPlans.some(({ executionStatus }) => executionStatus !== 'idle') ||
    relationshipResults.length > 0

  useEffect(() => {
    if (isImportActive) return
    if (Object.keys(readinessPauses).length > 0) {
      setActiveWizardStep('review')
      return
    }
    if (reviewReady && (!reviewHasIssues || hasExecutionAttempts)) {
      setActiveWizardStep('import')
    } else if (discoveryReady) {
      setActiveWizardStep('review')
    }
  }, [discoveryReady, hasExecutionAttempts, isImportActive, readinessPauses, reviewHasIssues, reviewReady])

  const updatePlan = (sourceId: string, update: Partial<ImportAllSourcePlan>) => {
    setPlans((current) => ({
      ...current,
      [sourceId]: { ...current[sourceId], ...update },
    }))
  }

  const policyForSource = (source: ImportAllPlanSource) => ({
    ...(source.workflowPolicy ?? {}),
    mode: workflowMode,
  })

  const isImplicitInteractiveReview = (
    readiness: Parameters<typeof importAllReadinessMessage>[0],
    source: ImportAllPlanSource | undefined
  ) => workflowMode === 'interactive' &&
    readiness.status === 'needs-input' && readiness.step === 'review' &&
    !readiness.inputKeys?.length && !source?.workflowPolicy?.reviewSteps?.includes('review')

  const setReviewAcknowledged = (
    sourceId: string,
    step: ImportReviewStep,
    acknowledged: boolean
  ) => {
    const completed = new Set(completedPreparationReviewsRef.current[sourceId] ?? [])
    if (acknowledged) completed.add(step)
    else completed.delete(step)
    completedPreparationReviewsRef.current[sourceId] = [...completed]
    setReadinessPauses((current) => {
      const next = { ...current }
      delete next[sourceId]
      return next
    })
    setReviewAcknowledgmentVersion((version) => version + 1)
  }

  const changeWorkflowMode = (mode: ImportWorkflowMode) => {
    if (mode === workflowMode || isImportActive) return
    operationGenerationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    completedPreparationReviewsRef.current = {}
    setReadinessPauses({})
    setReviewAcknowledgmentVersion((version) => version + 1)
    setWorkflowMode(mode)
  }

  const createMissingTypes = async (
    typePlans = enabledPlans.filter(
      (plan) => !context.object_type_by_slug[plan.type] && plan.records.length > 0
    )
  ) => {
    if (!typePlans.length || !canWrite) return false
    const operationGeneration = ++operationGenerationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setIsCreatingMissingTypes(true)
    setMissingTypeCreationError(undefined)
    try {
      for (const plan of typePlans) {
        if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return false
        const source = sourcesById[plan.sourceId]
        if (!source) continue
        const created = await runtime.createAutomaticType({
          source: source as ImportAllPlanSource,
          plan,
          token,
          signal: controller.signal,
        })
        if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return false
        updatePlan(plan.sourceId, { preparationStatus: 'loading', error: undefined })
        const progression = await progressImportAllSourcePreparation({
          source: source as ImportAllPlanSource,
          plan: { ...plan, preparationStatus: 'idle', error: undefined },
          objectTypeUuid: created.objectTypeUuid,
          schema: source.sourceAdapter.schema ?? created.schema,
          preloadedRecords: plan.records,
          token,
          signal: controller.signal,
          validator: validateRecord,
          fetchExisting: runtime.fetchExistingImportDocuments,
          policy: policyForSource(source as ImportAllPlanSource),
          canWrite,
          canCreateType: false,
          completedReviewSteps: completedPreparationReviewsRef.current[plan.sourceId] ?? [],
        })
        if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return false
        completedPreparationReviewsRef.current[plan.sourceId] = progression.completedReviewSteps
        updatePlan(plan.sourceId, progression.plan)
        setReadinessPauses((current) => {
          const next = { ...current }
          delete next[plan.sourceId]
          if (progression.decision.status === 'paused' && progression.decision.reason === 'readiness' &&
            !isImplicitInteractiveReview(progression.decision.readiness, source as ImportAllPlanSource)) {
            const message = importAllReadinessMessage(progression.decision.readiness)
            if (message) next[plan.sourceId] = message
          }
          return next
        })
        if (progression.plan.preparationStatus !== 'ready') {
          throw new Error(progression.plan.error ?? 'Type setup requires additional input before preparation can finish.')
        }
      }
      return true
    } catch (error) {
      if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
        setMissingTypeCreationError(error instanceof Error ? error.message : String(error))
      }
      return false
    } finally {
      if (operationGenerationRef.current === operationGeneration) {
        runtime.requestContextReload()
        setIsCreatingMissingTypes(false)
      }
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  const refreshTypesAndSchemas = () => {
    setMissingTypeCreationError(undefined)
    runtime.requestContextReload()
  }

  const persistRelationships = async (
    plans: ImportRelationshipPlan[],
    currentOperation?: { controller: AbortController; generation: number }
  ) => {
    const retryContext = relationshipRetryRef.current
    if (!retryContext || plans.length === 0) return
    const operationGeneration = currentOperation?.generation ?? ++operationGenerationRef.current
    const controller = currentOperation?.controller ?? new AbortController()
    if (!currentOperation) {
      controllerRef.current?.abort()
      controllerRef.current = controller
    }
    setIsPersistingRelationships(true)
    setRelationshipProgress({ completed: 0, total: plans.length })
    try {
      await persistImportRelationships({
        plans,
        documentUuids: retryContext.documentUuids,
        predicateUuids: retryContext.predicateUuids,
        signal: controller.signal,
        post: async (relationship, signal) => {
          if (shouldInjectRelationshipFailure()) {
            throw new Error('Intentional relationship retry test failure')
          }
          return runtime.postRelationship({
            relationship,
            token,
            signal,
          })
        },
        findExisting: async (relationship, signal) =>
          (
            await runtime.fetchRelationships({
              token,
              signal,
              params: {
                limit: 1,
                filters: [
                  {
                    column: 'from_document_uuid',
                    operator: 'eq',
                    value: relationship.from_document_uuid,
                  },
                  {
                    column: 'to_document_uuid',
                    operator: 'eq',
                    value: relationship.to_document_uuid,
                  },
                  { column: 'predicate_uuid', operator: 'eq', value: relationship.predicate_uuid },
                ],
              },
            })
          ).length > 0,
        onProgress: (completed, total) => {
          if (operationGenerationRef.current === operationGeneration) {
            setRelationshipProgress({ completed, total })
          }
        },
        onResult: (result) => {
          if (operationGenerationRef.current !== operationGeneration) return
          setRelationshipResults((current) => {
            const retained = current.find(
              ({ relationshipKey }) => relationshipKey === result.relationshipKey
            )
            if (retained?.status === 'created' || retained?.status === 'existing') return current
            return [
              ...current.filter(({ relationshipKey }) => relationshipKey !== result.relationshipKey),
              result,
            ]
          })
        },
      })
    } finally {
      if (operationGenerationRef.current === operationGeneration) {
        setIsPersistingRelationships(false)
      }
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  const discoverSelected = async (
    planSnapshot = plans
  ): Promise<Record<string, ImportAllSourcePlan> | undefined> => {
    setActiveWizardStep('discover')
    const operationGeneration = ++operationGenerationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setIsPersistingRelationships(false)
    setRelationshipResults([])
    setRelationshipProgress({ completed: 0, total: 0 })
    relationshipRetryRef.current = null
    completedPreparationReviewsRef.current = {}
    setReadinessPauses({})
    setReviewAcknowledgmentVersion((version) => version + 1)
    const selected = Object.values(planSnapshot).filter(({ enabled }) => enabled)
    const selectedIds = new Set(selected.map(({ sourceId }) => sourceId))
    const selectedCompositeGroups = compositeSourceGroups.filter((source) =>
      source.compositeSourceAdapter!.memberSourceIds.some((sourceId) => selectedIds.has(sourceId))
    )
    const compositeMemberIds = new Set(
      selectedCompositeGroups.flatMap((source) => source.compositeSourceAdapter!.memberSourceIds)
    )
    const independentSources = selected.filter(({ sourceId }) => !compositeMemberIds.has(sourceId))
    const loadingPlans = Object.fromEntries(
      Object.entries(planSnapshot).map(([sourceId, plan]) => [
        sourceId,
        plan.enabled
          ? {
            ...plan,
            status: 'loading' as const,
            preparationStatus: 'idle' as const,
            candidates: [],
            records: [],
            validationResults: [],
            reconciliations: [],
            error: undefined,
          }
          : plan,
      ])
    )
    setPlans(loadingPlans)
    const discoveredPlans: Record<string, ImportAllSourcePlan> = {}

    await Promise.all([
      ...independentSources.map(async (plan) => {
        const source = sourcesById[plan.sourceId]
        if (!source) return
        try {
          const result = await discoverImportAllSource({
            source: source as ImportAllPlanSource,
            plan: loadingPlans[plan.sourceId],
            limit: loadAllRecords ? undefined : recordLimit,
            signal: controller.signal,
          })
          if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
            discoveredPlans[plan.sourceId] = result
          }
        } catch {
          if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
            discoveredPlans[plan.sourceId] = {
              ...loadingPlans[plan.sourceId],
              status: 'error',
              candidates: [],
              error: 'Discovery was cancelled before this source completed.',
            }
          }
        }
      }),
      ...selectedCompositeGroups.map(async (source) => {
        const compositeAdapter = source.compositeSourceAdapter!
        const sourceIds = compositeAdapter.memberSourceIds
        const anchorPlan = planSnapshot[sourceIds[0]]
        if (!anchorPlan) return
        try {
          const discovered = await compositeAdapter.discover({
            url: anchorPlan.importUrl,
            signal: controller.signal,
          })
          const candidates = loadAllRecords
            ? discovered
            : discovered.slice(0, Math.max(0, recordLimit))
          const candidatesBySource = fanOutCompositeImportCandidates(candidates, sourceIds)
          for (const sourceId of sourceIds) {
            discoveredPlans[sourceId] = {
              ...loadingPlans[sourceId],
              status: 'ready',
              preparationStatus: 'idle',
              candidates: candidatesBySource[sourceId],
              records: [],
              validationResults: [],
              reconciliations: [],
              error: undefined,
            }
          }
        } catch (error) {
          if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return
          for (const sourceId of sourceIds) {
            discoveredPlans[sourceId] = {
              ...loadingPlans[sourceId],
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
      }),
    ])

    if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return undefined
    const nextPlans = { ...loadingPlans, ...discoveredPlans }
    setPlans(nextPlans)
    if (controllerRef.current === controller) controllerRef.current = null
    return nextPlans
  }

  const cancelDiscovery = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsPersistingRelationships(false)
    setIsCreatingMissingTypes(false)
    if (hasExecutionAttempts) setActiveWizardStep('import')
    setPlans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sourceId, plan]) => [
          sourceId,
          plan.status === 'loading' || plan.preparationStatus === 'loading'
            || plan.executionStatus === 'loading'
            ? {
              ...plan,
              status: plan.status === 'loading' ? 'idle' : plan.status,
              preparationStatus:
                plan.preparationStatus === 'loading' ? 'idle' : plan.preparationStatus,
              executionStatus: plan.executionStatus === 'loading' ? 'idle' : plan.executionStatus,
            }
            : plan,
        ])
      )
    )
  }

  const prepareSelected = async (
    planSnapshot = plans
  ): Promise<Record<string, ImportAllSourcePlan> | undefined> => {
    setActiveWizardStep('review')
    const operationGeneration = ++operationGenerationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setIsPersistingRelationships(false)
    setRelationshipResults([])
    setRelationshipProgress({ completed: 0, total: 0 })
    relationshipRetryRef.current = null
    setReadinessPauses({})
    const selected = Object.values(planSnapshot).filter(
      ({ enabled, status }) => enabled && status === 'ready'
    )
    const selectedIds = new Set(selected.map(({ sourceId }) => sourceId))
    const selectedCompositeGroups = compositeSourceGroups.filter((source) =>
      source.compositeSourceAdapter!.memberSourceIds.some((sourceId) => selectedIds.has(sourceId))
    )
    const compositeMemberIds = new Set(
      selectedCompositeGroups.flatMap((source) => source.compositeSourceAdapter!.memberSourceIds)
    )

    const loadingPlans: Record<string, ImportAllSourcePlan> = Object.fromEntries(
      Object.entries(planSnapshot).map(([sourceId, plan]) => [
        sourceId,
        plan.enabled && plan.status === 'ready'
          ? {
            ...plan,
            preparationStatus: 'loading',
            preparationCompleted: 0,
            preparationTotal: plan.candidates.length,
            executionStatus: 'idle',
            executionResults: [],
            error: undefined,
          }
          : plan,
      ])
    )
    setPlans(loadingPlans)

    let freshObjectTypes = Object.values(context.object_type_by_slug)
    let freshObjectSchemas = Object.values(context.object_schema_defaults_by_object_type_uuid)
    try {
      const [objectTypes, objectSchemas] = await Promise.all([
        runtime.fetchObjectTypes({ token, signal: controller.signal }),
        runtime.fetchObjectSchemas({ token, signal: controller.signal }),
      ])
      freshObjectTypes = objectTypes
      freshObjectSchemas = objectSchemas.filter((schema) => schema.is_type_default)
    } catch (error) {
      if (!controller.signal.aborted) {
        setPlans((current) =>
          Object.fromEntries(
            Object.entries(current).map(([sourceId, plan]) => [
              sourceId,
              plan.enabled && plan.status === 'ready'
                ? {
                  ...plan,
                  preparationStatus: 'error',
                  error: `Could not refresh object types and schemas: ${error instanceof Error ? error.message : String(error)}`,
                }
                : plan,
            ])
          )
        )
      }
      return undefined
    }
    if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) return undefined
    const objectTypesBySlug = Object.fromEntries(freshObjectTypes.map((type) => [type.slug, type]))
    const defaultSchemasByTypeUuid = Object.fromEntries(
      freshObjectSchemas.map((schema) => [schema.object_type_uuid, schema])
    )

    const compositeRecordsBySource: Record<string, CanonicalImportRecord[]> = {}
    const failedCompositeSourceIds = new Set<string>()
    await Promise.all(selectedCompositeGroups.map(async (source) => {
      const compositeAdapter = source.compositeSourceAdapter!
      const sourceIds = compositeAdapter.memberSourceIds
      const anchorPlan = planSnapshot[sourceIds[0]]
      if (!anchorPlan) return
      try {
        const recordsBySource = await loadCompositeImportRecords({
          adapter: compositeAdapter,
          candidates: anchorPlan.candidates,
          signal: controller.signal,
          batchSize: 10,
          onProgress: (completed, total) => {
            for (const sourceId of sourceIds) {
              updatePlan(sourceId, {
                preparationCompleted: completed,
                preparationTotal: total,
              })
            }
          },
        })
        Object.assign(compositeRecordsBySource, recordsBySource)
      } catch (error) {
        if (controller.signal.aborted) return
        for (const sourceId of sourceIds) {
          failedCompositeSourceIds.add(sourceId)
          updatePlan(sourceId, {
            preparationStatus: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }))

    const preparedPlans = await Promise.all(
      selected
        .filter(({ sourceId }) => !failedCompositeSourceIds.has(sourceId))
        .map(async (plan) => {
          const source = sourcesById[plan.sourceId]
          const isArraySource = source?.sourceAdapter.arrayTarget !== undefined
          const objectType = isArraySource ? undefined : objectTypesBySlug[plan.type]
          const schema = objectType
            ? source?.sourceAdapter.schema ?? defaultSchemasByTypeUuid[objectType.uuid]?.json_schema
            : undefined
          if (!source) return plan
          try {
            const preparationOptions = {
              source: source as ImportAllPlanSource,
              plan: { ...plan, preparationStatus: 'idle' as const, error: undefined },
              schema: schema as JSONSchema6 | undefined,
              objectTypeUuid: objectType?.uuid,
              token,
              signal: controller.signal,
              validator: validateRecord,
              fetchExisting: runtime.fetchExistingImportDocuments,
              preloadedRecords: compositeMemberIds.has(plan.sourceId)
                ? compositeRecordsBySource[plan.sourceId]
                : undefined,
              batchSize: 10,
              onProgress: (completed: number, total: number) =>
                updatePlan(plan.sourceId, {
                  preparationCompleted: completed,
                  preparationTotal: total,
                }),
            }
            const progression = isArraySource ? undefined : await progressImportAllSourcePreparation({
              ...preparationOptions,
              policy: policyForSource(source as ImportAllPlanSource),
              canWrite,
              canCreateType: false,
              createTypeIfMissing: runtime.createAutomaticType,
              completedReviewSteps: completedPreparationReviewsRef.current[plan.sourceId] ?? [],
            })
            const prepared = progression?.plan ?? await prepareImportAllSource(preparationOptions)
            if (progression) {
              completedPreparationReviewsRef.current[plan.sourceId] = progression.completedReviewSteps
              if (progression.decision.status === 'paused' && progression.decision.reason === 'readiness' &&
                !isImplicitInteractiveReview(progression.decision.readiness, source as ImportAllPlanSource)) {
                const message = importAllReadinessMessage(progression.decision.readiness)
                if (message) {
                  setReadinessPauses((current) => ({ ...current, [plan.sourceId]: message }))
                }
              }
            }
            if (!controller.signal.aborted) updatePlan(plan.sourceId, prepared)
            return prepared
          } catch {
            if (!controller.signal.aborted) {
              const failedPlan = {
                ...plan,
                preparationStatus: 'error' as const,
                error: 'Preparation was cancelled before this source completed.',
              }
              updatePlan(plan.sourceId, failedPlan)
              return failedPlan
            }
            return plan
          }
        })
    )

    if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
      const nextPlans = {
        ...planSnapshot,
        ...Object.fromEntries(preparedPlans.map((plan) => [plan.sourceId, plan])),
      } as Record<string, ImportAllSourcePlan>

      for (const arrayPlan of preparedPlans) {
        const arraySource = sourcesById[arrayPlan.sourceId]
        const target = arraySource?.sourceAdapter.arrayTarget
        if (!target || arrayPlan.preparationStatus !== 'ready') continue
        const parentSource = Object.values(sourcesById).find(
          (source) => source.sourceAdapter.sourceKey === target.parentSourceKey
        )
        const parentPlan = parentSource ? nextPlans[parentSource.sourceAdapter.id] : undefined
        if (!parentPlan || parentPlan.preparationStatus !== 'ready') {
          nextPlans[arrayPlan.sourceId] = {
            ...arrayPlan,
            preparationStatus: 'error',
            error: `Parent source "${target.parentSourceKey}" was not prepared.`,
          }
          continue
        }

        const parentObjectType = objectTypesBySlug[parentPlan.type]
        const parentSchema = parentSource?.sourceAdapter.schema ??
          (parentObjectType ? defaultSchemasByTypeUuid[parentObjectType.uuid]?.json_schema : undefined) ??
          parentPlan.validationContext?.schema
        const merged = mergeArraySourceRecordsIntoParentRecords({
          parentRecords: parentPlan.records,
          arrayRecords: arrayPlan.records,
          target,
        })
        if (!parentSource) continue
        const compositionPreparation = await progressImportAllSourcePreparation({
          source: parentSource as ImportAllPlanSource,
          plan: parentPlan,
          preloadedRecords: merged.records,
          schema: parentSchema as JSONSchema6 | undefined,
          objectTypeUuid: parentObjectType?.uuid,
          policy: parentSource ? policyForSource(parentSource as ImportAllPlanSource) : {},
          canWrite,
          canCreateType: false,
          completedReviewSteps: completedPreparationReviewsRef.current[parentPlan.sourceId] ?? [],
          token,
          signal: controller.signal,
          validator: validateRecord,
          fetchExisting: runtime.fetchExistingImportDocuments,
        })
        if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) break
        completedPreparationReviewsRef.current[parentPlan.sourceId] = compositionPreparation.completedReviewSteps
        if (compositionPreparation.decision.status === 'paused' && compositionPreparation.decision.reason === 'readiness' &&
          !isImplicitInteractiveReview(compositionPreparation.decision.readiness, parentSource as ImportAllPlanSource | undefined)) {
          const message = importAllReadinessMessage(compositionPreparation.decision.readiness)
          if (message) {
            setReadinessPauses((current) => ({ ...current, [parentPlan.sourceId]: message }))
          }
        }
        nextPlans[parentPlan.sourceId] = compositionPreparation.plan
        if (merged.unmatchedArrayRecords.length > 0) {
          nextPlans[arrayPlan.sourceId] = {
            ...arrayPlan,
            error: formatUnmatchedArrayRowsError(merged.unmatchedArrayRecords.length),
          }
        }
      }
      if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
        setPlans(nextPlans)
        if (controllerRef.current === controller) controllerRef.current = null
        return nextPlans
      }
    }

    if (controllerRef.current === controller) controllerRef.current = null
    return undefined
  }

  const executeSelected = async (
    recordKeysBySource?: Record<string, ReadonlySet<string>>,
    planSnapshot = plans,
    acknowledgeGeneralReview = false
  ) => {
    setActiveWizardStep('import')
    const operationGeneration = ++operationGenerationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setIsPersistingRelationships(false)
    const selected = Object.values(planSnapshot).filter(
      ({ sourceId, enabled, preparationStatus }) =>
        enabled &&
        preparationStatus === 'ready' &&
        !sourcesById[sourceId]?.sourceAdapter.arrayTarget &&
        (!recordKeysBySource || recordKeysBySource[sourceId] !== undefined)
    )
    const snapshotPlans = Object.values(planSnapshot)
    const relationshipPlansForExecution = buildRelationshipPlans(snapshotPlans)
    if (acknowledgeGeneralReview) {
      for (const plan of selected) {
        const completed = new Set(completedPreparationReviewsRef.current[plan.sourceId] ?? [])
        completed.add('review')
        completedPreparationReviewsRef.current[plan.sourceId] = [...completed]
      }
      setReviewAcknowledgmentVersion((version) => version + 1)
    }
    console.log('[Import All] selected sources for execution', {
      sources: selected.map((plan) => ({
        sourceId: plan.sourceId,
        type: plan.type,
        enabled: plan.enabled,
        preparationStatus: plan.preparationStatus,
        records: plan.records.length,
        reconciliations: plan.reconciliations.length,
      })),
      retry: recordKeysBySource !== undefined,
    })
    const executedPlans: ImportAllSourcePlan[] = []
    let documentsReady = selected.length > 0
    for (const plan of selected) {
      if (operationGenerationRef.current !== operationGeneration || controller.signal.aborted) {
        documentsReady = false
        break
      }
      const objectType = context.object_type_by_slug[plan.type]
      const source = sourcesById[plan.sourceId]
      if (!objectType || !source) {
        if (operationGenerationRef.current === operationGeneration) {
          updatePlan(plan.sourceId, {
            executionStatus: 'error',
            error: `Object type "${plan.type}" was not available when execution started. Prepare the plan again.`,
          })
        }
        documentsReady = false
        break
      }
      updatePlan(plan.sourceId, {
        executionStatus: 'loading',
        executionCompleted: 0,
        executionTotal: recordKeysBySource?.[plan.sourceId]?.size ?? plan.reconciliations.length,
        error: undefined,
      })
      const importSource = source as ImportAllPlanSource
      const schema = source.sourceAdapter.schema ??
        context.object_schema_defaults_by_object_type_uuid[objectType.uuid]?.json_schema ??
        plan.validationContext?.schema
      const policy = {
        ...policyForSource(importSource),
        defaultConflictAction: plan.defaultConflictAction,
      }
      const relationshipBlockers = relationshipPlansForExecution
        .filter(({ child, status }) =>
          child.record.provenance.sourceId === plan.sourceId && status !== 'ready'
        )
        .map(({ reason }) => reason ?? 'Relationship dependency is not ready.')
      try {
        const result = await executePreparedImportAllSource({
          plan: { ...plan, executionStatus: 'idle', error: plan.executionStatus === 'error' ? undefined : plan.error },
          policy,
          objectTypeUuid: objectType.uuid,
          schema: schema as JSONSchema6 | undefined,
          canWrite,
          canCreateType: false,
          optedInReviewSteps: policy.reviewSteps,
          completedReviewSteps: completedPreparationReviewsRef.current[plan.sourceId] ?? [],
          relationshipBlockers,
          signal: controller.signal,
          mergeStrategy: 'client-patch',
          recordKeys: recordKeysBySource?.[plan.sourceId],
          retryReconciliation: {
            token,
            fetchExisting: runtime.fetchExistingImportDocuments,
          },
          persistence: {
            post: (document, signal) => runtime.postDocument({ document, token, signal }),
            patch: (uuid, document, signal) => runtime.patchDocument({ uuid, document, token, signal }),
            mergeRpc: (uuid, document, signal) => runtime.mergeImportDocumentViaRpc({
              rpcPath: IMPORT_MERGE_RPC,
              documentUuid: uuid,
              incomingDocument: document,
              token,
              signal,
            }),
            fetchBySlug: (slug, objectTypeUuid, signal) => runtime.fetchExistingDocumentBySlug({
              slug,
              objectTypeUuid,
              token,
              signal,
            }),
          },
          onProgress: (completed, total) => {
            if (operationGenerationRef.current === operationGeneration && !controller.signal.aborted) {
              updatePlan(plan.sourceId, {
                executionCompleted: completed,
                executionTotal: total,
              })
            }
          },
        })
        if (operationGenerationRef.current !== operationGeneration) return
        const adoptedPlan = mergeImportAllExecutionPlan(plan, result.plan)
        updatePlan(plan.sourceId, adoptedPlan)
        if (result.decision.status === 'paused' && result.decision.readiness.status !== 'complete') {
          const message = importAllReadinessMessage(result.decision.readiness)
          if (message) setReadinessPauses((current) => ({ ...current, [plan.sourceId]: message }))
          setActiveWizardStep('review')
        } else {
          setReadinessPauses((current) => {
            const next = { ...current }
            delete next[plan.sourceId]
            return next
          })
        }
        if (!controller.signal.aborted && result.decision.readiness.status === 'complete' &&
          (result.decision.status === 'paused' || !result.decision.cancelled)) {
          executedPlans.push(adoptedPlan)
          continue
        }
        if (!controller.signal.aborted) {
          updatePlan(plan.sourceId, {
            executionStatus: 'error',
            error: importAllReadinessMessage(result.decision.readiness),
          })
        }
        documentsReady = false
        break
      } catch (error) {
        if (operationGenerationRef.current !== operationGeneration) return
        if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
          updatePlan(plan.sourceId, {
            executionStatus: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        }
        documentsReady = false
        break
      }
    }

    if (!recordKeysBySource && documentsReady && !controller.signal.aborted &&
      operationGenerationRef.current === operationGeneration) {
      if (executedPlans.length !== selected.length) {
        if (controllerRef.current === controller) controllerRef.current = null
        return
      }
      const documentUuids = collectImportDocumentUuids({
        executedPlans,
        objectTypesBySlug: context.object_type_by_slug,
      })
      let uuidLookupError: string | undefined
      for (const executed of executedPlans) {
        if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) break
        const objectType = context.object_type_by_slug[executed.type]
        if (!objectType) continue
        try {
          const documents = await runtime.fetchExistingImportDocuments({
            records: executed.records,
            objectTypeUuid: objectType.uuid,
            token,
            signal: controller.signal,
          })
          if (controller.signal.aborted || operationGenerationRef.current !== operationGeneration) break
          const documentsBySlug = new Map(documents.map((document) => [document.slug, document]))
          const documentsByExternalId = new Map(
            documents
              .map(
                (document) => [getDocumentImportProvenance(document)?.external_id, document] as const
              )
              .filter(([externalId]) => externalId !== undefined)
          )
          for (const record of executed.records) {
            const documentKey = relationshipDocumentKey({
              record,
              objectTypeUuid: objectType.uuid,
              objectTypeSlug: objectType.slug,
            })
            if (documentUuids.has(documentKey)) continue
            const document =
              documentsByExternalId.get(record.provenance.externalId) ??
              documentsBySlug.get(record.slug)
            if (!document) continue
            documentUuids.set(documentKey, document.uuid)
          }
        } catch (error) {
          if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
            uuidLookupError = error instanceof Error ? error.message : String(error)
          }
          break
        }
      }
      if (uuidLookupError && operationGenerationRef.current === operationGeneration) {
        for (const executed of executedPlans) {
          updatePlan(executed.sourceId, {
            error: `Could not resolve document UUIDs for relationships: ${uuidLookupError}`,
          })
        }
      } else if (!controller.signal.aborted && operationGenerationRef.current === operationGeneration) {
        const predicateUuids = new Map(
          [
            ...Object.values(context.predicate_by_predicate),
            ...Object.values(context.predicate_by_uuid),
          ].map((predicate) => [predicate.predicate, predicate.uuid])
        )
        relationshipRetryRef.current = {
          plans: relationshipPlansForExecution,
          documentUuids,
          predicateUuids,
        }
        const completedKeys = new Set(relationshipResults.map(({ relationshipKey }) => relationshipKey))
        const pendingPlans = relationshipPlansForExecution.filter(
          (relationshipPlan) => relationshipPlan.status === 'ready' &&
            !completedKeys.has(importRelationshipKey(relationshipPlan))
        )
        await persistRelationships(pendingPlans, { controller, generation: operationGeneration })
      }
    }

    if (controllerRef.current === controller) controllerRef.current = null
  }

  const runSimplifiedImport = async () => {
    if (isImportActive || !canWrite) return
    let snapshot = plans
    let enabledPlans = Object.values(snapshot).filter(({ enabled }) => enabled)
    if (enabledPlans.length === 0) return
    if (enabledPlans.some(({ status }) => status !== 'ready')) {
      const discovered = await discoverSelected(snapshot)
      if (!discovered) return
      snapshot = discovered
    }
    enabledPlans = Object.values(snapshot).filter(({ enabled }) => enabled)
    if (enabledPlans.some(({ status }) => status !== 'ready')) return
    if (enabledPlans.some(({ preparationStatus }) => preparationStatus !== 'ready')) {
      const prepared = await prepareSelected(snapshot)
      if (!prepared) return
      snapshot = prepared
    }

    const relationshipPlansForSnapshot = buildRelationshipPlans(Object.values(snapshot))
    const pauses: Record<string, string> = {}
    for (const plan of Object.values(snapshot).filter(({ enabled }) => enabled)) {
      const source = sourcesById[plan.sourceId]
      if (!source) continue
      const arrayTarget = source.sourceAdapter.arrayTarget
      if (arrayTarget) {
        if (plan.error || plan.preparationStatus !== 'ready') {
          const parent = Object.values(sourcesById).find(
            (candidate) => candidate.sourceAdapter.sourceKey === arrayTarget.parentSourceKey
          )
          const parentId = parent?.sourceAdapter.id ?? plan.sourceId
          pauses[parentId] = plan.error ?? `Prepare array source ${plan.sourceId} before importing its parent.`
        }
        continue
      }
      const objectType = context.object_type_by_slug[plan.type]
      const relationshipBlockers = relationshipPlansForSnapshot
        .filter(({ child, status }) =>
          child.record.provenance.sourceId === plan.sourceId && status !== 'ready'
        )
        .map(({ reason }) => reason ?? 'Relationship dependency is not ready.')
      const schema = source.sourceAdapter.schema ??
        (objectType
          ? context.object_schema_defaults_by_object_type_uuid[objectType.uuid]?.json_schema
          : undefined) ??
        plan.validationContext?.schema
      const readiness = evaluateImportSourceReadiness({
        plan,
        policy: policyForSource(source as ImportAllPlanSource),
        objectTypeUuid: objectType?.uuid,
        schema: schema as JSONSchema6 | undefined,
        canWrite,
        canCreateType: false,
        optedInReviewSteps: source.workflowPolicy?.reviewSteps,
        completedReviewSteps: completedPreparationReviewsRef.current[plan.sourceId] ?? [],
        relationshipBlockers,
      })
      if (readiness.status === 'advance' && readiness.action === 'execute') continue
      if (readiness.status === 'complete') continue
      const message = importAllReadinessMessage(readiness)
      if (message) pauses[plan.sourceId] = message
    }
    setReadinessPauses(pauses)
    if (Object.keys(pauses).length > 0) {
      setActiveWizardStep('review')
      return
    }
    await executeSelected(undefined, snapshot)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="sticky top-0 z-10 flex flex-wrap items-end gap-4 border-b bg-white px-5 py-4">
        <div className="min-w-52 grow">
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{summary.enabledSources} sources</span>
            <span>{summary.records} records found</span>
            <span>{summary.failedSources} source errors</span>
            <span
              className={`inline-flex items-center gap-1 ${missingTypes.length > 0 ? 'bg-red-700 px-2 py-1 text-white' : 'text-green-700'}`}
            >
              {missingTypes.length > 0 ? <X size={14} /> : <Check size={14} />}
              {missingTypes.length} types need setup
            </span>
            <span
              className={`inline-flex items-center gap-1 ${missingSchemas.length > 0 ? 'bg-red-700 px-2 py-1 text-white' : 'text-green-700'}`}
            >
              {missingSchemas.length > 0 ? <X size={14} /> : <Check size={14} />}
              {missingSchemas.length} schemas need setup
            </span>
            {isPreparing && (
              <span className="text-blue-700">
                Preparing {preparationProgress.completed} of {preparationProgress.total} records
                across {preparationProgress.sources} sources
              </span>
            )}
            {isExecuting && executionProgress.total > 0 && (
              <span className="text-blue-700">
                Importing {executionProgress.completed} of {executionProgress.total} records
              </span>
            )}
            {relationshipProgress.total > 0 && (
              <span className="text-blue-700">
                Linking {relationshipProgress.completed} of {relationshipProgress.total} relationships
              </span>
            )}
          </div>
          <fieldset
            aria-label="Import mode"
            disabled={isImportActive}
            className="mt-3 inline-flex items-center rounded-md border border-gray-300 p-0.5 text-sm"
          >
            <legend className="sr-only">Import mode</legend>
            {(['simplified', 'interactive'] as const).map((mode) => (
              <label
                key={mode}
                className={`cursor-pointer rounded px-3 py-1 ${workflowMode === mode ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'} ${isImportActive ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="import-workflow-mode"
                  value={mode}
                  checked={workflowMode === mode}
                  onChange={() => changeWorkflowMode(mode)}
                />
                {mode === 'simplified' ? 'Simplified' : 'Interactive'}
              </label>
            ))}
          </fieldset>
        </div>
      </header>

      <section className="border-b px-5 py-3" aria-label="Import plan status">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <strong>{reviewReady ? 'Plan prepared' : 'Plan needs review'}</strong>
          <span>
            {summary.readySources} of {summary.enabledSources} sources discovered
          </span>
          <span>{summary.preparedSources} sources prepared</span>
          <span>{summary.validRecords} valid</span>
          <span>{summary.invalidRecords} invalid</span>
          <span>{summary.conflicts} conflicts</span>
          <span>
            {relationshipPlans.filter(({ status }) => status === 'ready').length} relationships
            ready
          </span>
          <span>
            {relationshipPlans.filter(({ status }) => status !== 'ready').length} relationship
            blockers
          </span>
          {relationshipResults.length > 0 && (
            <>
              <span>
                {relationshipResults.filter(({ status }) => status === 'created').length} links
                created
              </span>
              <span>
                {relationshipResults.filter(({ status }) => status === 'existing').length} links
                already existed
              </span>
              <span>
                {relationshipResults.filter(({ status }) => status === 'failed').length} link
                failures
              </span>
            </>
          )}
          {reviewReady && <span className="text-green-700">Ready for execution review</span>}
        </div>
        {missingTypeCreationError && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-700" role="alert">
            <span>Could not create missing types: {missingTypeCreationError}</span>
            {/object_type_slug_unique/i.test(missingTypeCreationError) && (
              <Button
                size="xs"
                variant="outline"
                onClick={refreshTypesAndSchemas}
                disabled={isCreatingMissingTypes}
              >
                Refresh types and schemas
              </Button>
            )}
          </div>
        )}
        {isPreparing && preparationProgress.total > 0 && (
          <progress
            className="mt-3 h-2 w-full bg-gray-100 accent-blue-600"
            max={preparationProgress.total}
            value={preparationProgress.completed}
            aria-label="Overall preparation progress"
          />
        )}
        {isExecuting && executionProgress.total > 0 && (
          <progress
            className="mt-3 h-2 w-full bg-gray-100 accent-blue-600"
            max={executionProgress.total}
            value={executionProgress.completed}
            aria-label="Overall import progress"
          />
        )}
        {relationshipProgress.total > 0 && (
          <progress
            className="mt-3 h-2 w-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 accent-white"
            max={relationshipProgress.total}
            value={relationshipProgress.completed}
            aria-label="Relationship import progress"
          />
        )}
      </section>

      <ImportWizard
        activeStep={activeWizardStep}
        onStepChange={setActiveWizardStep}
        steps={[
          {
            id: 'discover',
            label: 'Discover sources',
            completed: discoveryReady,
          },
          {
            id: 'review',
            label: 'Prepare and review',
            completed: reviewReady,
          },
          {
            id: 'import',
            label: 'Import records',
            disabled: !reviewReady,
          },
        ]}
      />

      <section className="border-b bg-slate-50 px-5 py-3" aria-label="Current import step actions">
        {activeWizardStep === 'discover' && (
          <div className="flex flex-wrap items-end gap-3">
            <Checkbox
              id="import-all-sources"
              testId="import-all-sources"
              label="Select all sources"
              value={allSourcesSelected}
              onChange={(selected) =>
                setPlans((current) =>
                  Object.fromEntries(
                    Object.entries(current).map(([sourceId, plan]) => [
                      sourceId,
                      {
                        ...plan,
                        enabled: selected,
                        status: selected ? plan.status : 'idle',
                        preparationStatus: selected ? plan.preparationStatus : 'idle',
                      },
                    ])
                  )
                )
              }
            />
            <Checkbox
              id="import-all-records"
              testId="import-all-records"
              label="All available records"
              value={loadAllRecords}
              onChange={setLoadAllRecords}
            />
            <Input
              id="import-all-limit"
              testId="import-all-limit"
              label="Records per source"
              size="xs"
              disabled={loadAllRecords}
              value={recordLimit.toString()}
              onChange={(value) => {
                const parsed = Number(value)
                if (Number.isInteger(parsed) && parsed >= 0) setRecordLimit(parsed)
              }}
            />
            {isImportActive ? (
              <Button variant="destructive" onClick={cancelDiscovery}>
                <X size={16} /> Cancel
              </Button>
            ) : (
              <Button
                disabled={enabledPlans.length === 0 || (workflowMode === 'simplified' && !canWrite)}
                onClick={() => workflowMode === 'simplified'
                  ? void runSimplifiedImport()
                  : void discoverSelected()}
              >
                {workflowMode === 'simplified' ? <Check size={16} /> : <Search size={16} />}
                {workflowMode === 'simplified' ? 'Import' : 'Discover selected'}
              </Button>
            )}
          </div>
        )}
        {activeWizardStep === 'review' && (
          <div className="flex flex-wrap items-center gap-3">
            {workflowMode === 'simplified' ? (
              <Button
                disabled={isImportActive || !discoveryReady || !canWrite}
                onClick={() => void runSimplifiedImport()}
              >
                <Check size={16} /> Import
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={isImportActive || !discoveryReady || !canWrite}
                onClick={() => void prepareSelected()}
              >
                <ShieldCheck size={16} /> Prepare review
              </Button>
            )}
            <Button
              variant="outline"
              disabled={
                isImportActive ||
                missingTypes.length === 0 ||
                missingTypes.some((plan) => plan.records.length === 0) ||
                !canWrite
              }
              onClick={() => void createMissingTypes()}
            >
              {isCreatingMissingTypes ? 'Creating types...' : 'Create missing types'}
            </Button>
            <span
              className={`inline-flex items-center gap-2 text-sm ${reviewHasIssues ? 'font-semibold text-amber-800' : 'text-gray-600'}`}
            >
              {reviewHasIssues && <CircleAlert size={16} />}
              {reviewHasIssues
                ? 'Resolve review issues below before moving to Import.'
                : 'Review validation, duplicate conflicts, and relationship blockers below.'}
            </span>
          </div>
        )}
        {activeWizardStep === 'review' && enabledPlans.some(
          (plan) => (sourcesById[plan.sourceId]?.workflowPolicy?.reviewSteps?.length ?? 0) > 0
        ) && (
          <div
            key={reviewAcknowledgmentVersion}
            className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
            aria-label="Configured review acknowledgments"
          >
            {enabledPlans.flatMap((plan) =>
              (sourcesById[plan.sourceId]?.workflowPolicy?.reviewSteps ?? []).map((step) => (
                <label key={`${plan.sourceId}:${step}`} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={completedPreparationReviewsRef.current[plan.sourceId]?.includes(step) ?? false}
                    onChange={(event) => setReviewAcknowledged(plan.sourceId, step, event.target.checked)}
                  />
                  Confirm {step} review for {plan.sourceId}
                </label>
              ))
            )}
          </div>
        )}
        {activeWizardStep === 'import' && (
          <div className="flex flex-wrap items-center gap-3">
            {workflowMode === 'simplified' ? (
              <Button
                disabled={isImportActive || !discoveryReady || !canWrite}
                onClick={() => void runSimplifiedImport()}
              >
                <Check size={16} /> Import
              </Button>
            ) : (
              <Button
                disabled={isImportActive || !reviewReady || !canWrite}
                onClick={() => void executeSelected(undefined, plans, true)}
              >
                <Check size={16} /> Execute import
              </Button>
            )}
            {relationshipResults.some(({ status }) => status === 'failed' || status === 'unattempted') && (
              <Button
                size="xs"
                variant="outline"
                disabled={isExecuting || isPersistingRelationships}
                onClick={() => {
                  const retryableKeys = new Set(
                    relationshipResults
                      .filter(({ status }) => status === 'failed' || status === 'unattempted')
                      .map(({ relationshipKey }) => relationshipKey)
                  )
                  const failedPlans =
                    relationshipRetryRef.current?.plans.filter((plan) =>
                      plan.status === 'ready' && retryableKeys.has(importRelationshipKey(plan))
                    ) ?? []
                  void persistRelationships(failedPlans)
                }}
              >
                Retry unfinished links
              </Button>
            )}
            <span className="text-sm text-gray-600">
              Documents run first, followed by ready relationship links.
            </span>
          </div>
        )}
        {Object.entries(readinessPauses).map(([sourceId, message]) => (
          <p key={sourceId} className="mt-2 text-sm text-amber-900" role="alert">
            {sourceId}: {message}
          </p>
        ))}
      </section>

      <nav className="flex gap-1 border-b px-5 pt-3" aria-label="Import views">
        <Button
          size="xs"
          variant={activeView === 'plan' ? 'default' : 'outline'}
          onClick={() => setActiveView('plan')}
        >
          Plan
        </Button>
        <Button
          size="xs"
          variant={activeView === 'errors' ? 'default' : 'outline'}
          onClick={() => setActiveView('errors')}
        >
          Errors ({importErrors.length})
        </Button>
      </nav>

      {activeView === 'errors' ? (
        <section className="min-h-0 flex-1 overflow-auto px-5 py-4" aria-label="Import errors">
          {importErrors.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check size={16} /> No import errors
            </div>
          ) : (
            <div className="border">
              {importErrors.map((error, index) => (
                <div
                  key={`${error.scope}-${error.recordKey ?? 'source'}-${index}`}
                  className="flex flex-wrap items-start gap-3 border-b px-3 py-3 text-sm last:border-b-0"
                >
                  <CircleAlert className="mt-0.5 shrink-0 text-red-700" size={16} />
                  <span className="font-medium capitalize">{error.scope}</span>
                  <span className="font-medium">{error.sourceLabel}</span>
                  {error.recordKey && <span className="text-gray-500">{error.recordKey}</span>}
                  <span className="min-w-0 flex-1">{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {pageConfiguredSources.map((source, index) => {
            const plan = plans[source.sourceAdapter.id]
            const compositeGroup = compositeSourceByMemberId.get(plan.sourceId)
            const isCompositeAnchor = source.compositeSourceAdapter !== undefined
            const objectType = context.object_type_by_slug[source.type]
            const Icon = source.icon
            const invalidCount = plan.validationResults.filter(({ isValid }) => !isValid).length
            const conflictCount = plan.reconciliations.filter(
              ({ status }) => status === 'conflicting' || status === 'ambiguous'
            ).length
            const relationshipBlockerCount = relationshipPlans.filter(({ child, parent, status }) =>
              status !== 'ready' &&
              (child.record.provenance.sourceId === plan.sourceId ||
                parent?.record.provenance.sourceId === plan.sourceId)
            ).length
            const sourceAttention: string[] = []
            if (!objectType && plan.records.length > 0) sourceAttention.push('type setup needed')
            if (objectType && missingSchemas.some(({ sourceId }) => sourceId === plan.sourceId)) {
              sourceAttention.push('schema setup needed')
            }
            if (invalidCount > 0) sourceAttention.push(`${invalidCount} invalid`)
            if (conflictCount > 0) sourceAttention.push(`${conflictCount} duplicate conflicts`)
            if (relationshipBlockerCount > 0) {
              sourceAttention.push(`${relationshipBlockerCount} relationship blockers`)
            }
            if (plan.error || importErrors.some(({ sourceLabel }) => sourceLabel === source.label)) {
              sourceAttention.push('source error')
            }
            const hasChangedRecords =
              plan.preparationStatus === 'ready' &&
              plan.reconciliations.some(({ status }) => status === 'conflicting')
            return (
              <section
                key={source.sourceAdapter.id}
                className={`relative border-b px-5 py-4 lg:pr-104 ${plan.enabled ? (plan.status !== 'idle' ? 'lg:min-h-96' : 'lg:min-h-32') : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="grid grid-cols-[minmax(15rem,1fr)_9rem_11rem_auto] items-center gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {compositeGroup && !isCompositeAnchor ? (
                      <span className="shrink-0 text-xs text-gray-500">Included</span>
                    ) : (
                      <Checkbox
                        id={`plan-${source.type}`}
                        testId={`plan-${source.type}`}
                        value={plan.enabled}
                        onChange={(enabled) => {
                          const sourceIds = source.compositeSourceAdapter?.memberSourceIds ?? [plan.sourceId]
                          for (const sourceId of sourceIds) {
                            const memberPlan = plans[sourceId]
                            updatePlan(sourceId, {
                              enabled,
                              status: enabled ? memberPlan.status : 'idle',
                              preparationStatus: enabled ? memberPlan.preparationStatus : 'idle',
                            })
                          }
                        }}
                      />
                    )}
                    <Icon className="shrink-0 text-gray-700" size={20} />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">
                        {isCompositeAnchor ? 'ERDDAP MODL Composite' : source.label}
                      </strong>
                      <span className="block truncate text-xs text-gray-500">
                        {isCompositeAnchor
                          ? 'Dataset and grouped variable metadata'
                          : source.type}
                        {compositeGroup && !isCompositeAnchor && ' · included in composite'}
                      </span>
                      {sourceAttention.length > 0 && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                          <CircleAlert size={14} />
                          {sourceAttention.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {statusIcon(plan.status)}
                    <span>{plan.status}</span>
                  </div>
                  <div className="text-sm">
                    {plan.status === 'ready' ? `${plan.candidates.length} records` : 'Not counted'}
                  </div>
                  <div className="flex justify-end gap-2">
                    {!objectType && plan.preparationStatus === 'ready' && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setTypeSetupSourceId(plan.sourceId)}
                      >
                        Set up type
                      </Button>
                    )}
                    {!objectType && plan.preparationStatus !== 'ready' && (
                      <span className="text-sm text-amber-700">Pending type</span>
                    )}
                    {objectType && (
                      <span className="text-sm text-green-700">{objectType.label}</span>
                    )}
                  </div>
                </div>

                {plan.enabled && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-gray-600">Source settings</summary>
                    <div className="mt-3 max-w-3xl">
                      <Input
                        id={`plan-url-${source.type}`}
                        testId={`plan-url-${source.type}`}
                        label="Discovery URL"
                        size="sm"
                        value={plan.importUrl}
                        onChange={(importUrl) => {
                          const sourceIds = source.compositeSourceAdapter?.memberSourceIds ?? [plan.sourceId]
                          for (const sourceId of sourceIds) {
                            updatePlan(sourceId, {
                              importUrl: importUrl ?? source.sourceAdapter.defaultImportUrl,
                              status: 'idle',
                              preparationStatus: 'idle',
                              candidates: [],
                              records: [],
                              validationResults: [],
                              reconciliations: [],
                              error: undefined,
                            })
                          }
                        }}
                      />
                    </div>
                  </details>
                )}

                {plan.preparationStatus === 'ready' && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <label htmlFor={`default-conflict-${source.type}`}>Conflict default</label>
                    <select
                      id={`default-conflict-${source.type}`}
                      value={plan.defaultConflictAction}
                      onChange={(event) =>
                        updatePlan(plan.sourceId, {
                          defaultConflictAction: event.target
                            .value as typeof plan.defaultConflictAction,
                          executionStatus: 'idle',
                          executionResults: [],
                        })
                      }
                      className="border px-2 py-1"
                    >
                      <option value="ignore">Ignore</option>
                      <option value="overwrite">Overwrite</option>
                      <option value="merge">Merge</option>
                    </select>
                    <span className="text-gray-500">
                      Applies to changed records unless overridden below.
                    </span>
                  </div>
                )}

                {plan.error && (
                  <div className="mt-3 text-sm text-red-700" role="alert">
                    {plan.error}
                  </div>
                )}

                {plan.preparationStatus !== 'idle' && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span className="inline-flex items-center gap-2">
                      {statusIcon(plan.preparationStatus)} Preparation: {plan.preparationStatus}
                    </span>
                    {plan.preparationStatus === 'loading' && (
                      <>
                        <span>
                          {plan.preparationCompleted} of {plan.preparationTotal} records loaded
                        </span>
                        {plan.preparationTotal > 0 && (
                          <progress
                            className="h-2 min-w-32 flex-1 bg-gray-100 accent-blue-600"
                            max={plan.preparationTotal}
                            value={plan.preparationCompleted}
                            aria-label={`${plan.label} preparation progress`}
                          />
                        )}
                      </>
                    )}
                    {plan.preparationStatus === 'ready' && (
                      <>
                        <span>{plan.records.length} loaded</span>
                        <span>
                          {plan.validationResults.filter(({ isValid }) => isValid).length} valid
                        </span>
                        <span>
                          {plan.validationResults.filter(({ isValid }) => !isValid).length} invalid
                        </span>
                        <span>
                          {plan.reconciliations.filter(({ status }) => status === 'new').length} new
                        </span>
                        <span>
                          {plan.reconciliations.filter(({ status }) => status === 'exact').length}{' '}
                          identical
                        </span>
                        <span>
                          {
                            plan.reconciliations.filter(({ status }) => status === 'conflicting')
                              .length
                          }{' '}
                          changed
                        </span>
                        <span>
                          {
                            plan.reconciliations.filter(({ status }) => status === 'ambiguous')
                              .length
                          }{' '}
                          ambiguous
                        </span>
                      </>
                    )}
                  </div>
                )}

                {plan.enabled && (
                  <div className="absolute right-4 top-4 mt-0 w-96">
                    <Tabs
                      className="gap-0!"
                      navClassName="mb-0"
                      defaultContentClassName="p-0"
                      tabs={[
                        {
                          id: 'activity',
                          label: 'Import activity',
                          content: <ImportActivity plan={plan} />,
                        },
                        ...(hasChangedRecords
                          ? [
                            {
                              id: 'changed',
                              label: `Changed records (${plan.reconciliations.filter(({ status }) => status === 'conflicting').length})`,
                              content: (
                                <div className="border bg-white p-2 text-sm shadow-sm">
                                  <div className="flex justify-end border-b px-1 pb-2">
                                    <select
                                      aria-label="Apply conflict action to all changed records"
                                      defaultValue=""
                                      onChange={(event) => {
                                        const action = event.target.value as
                                          'ignore' | 'overwrite' | 'merge'
                                        if (!action) return
                                        const conflictActions = Object.fromEntries(
                                          plan.reconciliations
                                            .filter(({ status }) => status === 'conflicting')
                                            .map(({ record }) => [
                                              importAllRecordKey(record),
                                              action,
                                            ])
                                        )
                                        updatePlan(plan.sourceId, {
                                          conflictActions,
                                          executionStatus: 'idle',
                                          executionResults: [],
                                        })
                                        event.target.value = ''
                                      }}
                                      className="ml-auto border px-2 py-1"
                                    >
                                      <option value="">Apply to all...</option>
                                      <option value="ignore">Ignore all</option>
                                      <option value="overwrite">Overwrite all</option>
                                      <option value="merge">Merge all</option>
                                    </select>
                                  </div>
                                  <TableVirtuoso
                                    className="w-full overflow-y-auto"
                                    style={{ height: 280 }}
                                    components={{
                                      Table: (props) => (
                                        <table {...props} className="w-full table-fixed" />
                                      ),
                                    }}
                                    data={plan.reconciliations.filter(
                                      ({ status }) => status === 'conflicting'
                                    )}
                                    itemContent={(_, item) => {
                                      const key = importAllRecordKey(item.record)
                                      return (
                                        <td className="w-full p-0">
                                          <label className="flex w-full items-center gap-2 border-b px-2 py-1.5">
                                            <span className="min-w-0 flex-1 truncate">
                                              {item.existingDocuments[0]?.uuid ? (
                                                <Link
                                                  className="text-blue-700 hover:underline"
                                                  to={`/document/edit/${item.existingDocuments[0].uuid}`}
                                                >
                                                  {item.record.label}
                                                </Link>
                                              ) : (
                                                item.record.label
                                              )}
                                            </span>
                                            <select
                                              aria-label={`Conflict action for ${item.record.label}`}
                                              value={
                                                plan.conflictActions[key] ??
                                                plan.defaultConflictAction
                                              }
                                              onChange={(event) =>
                                                updatePlan(plan.sourceId, {
                                                  conflictActions: {
                                                    ...plan.conflictActions,
                                                    [key]: event.target
                                                      .value as typeof plan.defaultConflictAction,
                                                  },
                                                  executionStatus: 'idle',
                                                  executionResults: [],
                                                })
                                              }
                                              className="ml-auto shrink-0 border px-2 py-1"
                                            >
                                              <option value="ignore">Ignore</option>
                                              <option value="overwrite">Overwrite</option>
                                              <option value="merge">Merge</option>
                                            </select>
                                          </label>
                                        </td>
                                      )
                                    }}
                                  />
                                </div>
                              ),
                            },
                          ]
                          : []),
                      ]}
                    />
                  </div>
                )}

                {plan.executionStatus !== 'idle' && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span>Execution: {plan.executionStatus}</span>
                    {plan.executionTotal > 0 && (
                      <span className="flex min-w-52 flex-1 items-center gap-2">
                        <progress
                          className="h-2 min-w-32 flex-1 bg-gray-100 accent-blue-600"
                          max={plan.executionTotal}
                          value={plan.executionCompleted}
                          aria-label={`${plan.label} import progress`}
                        />
                        <span>
                          {plan.executionCompleted} of {plan.executionTotal}
                        </span>
                      </span>
                    )}
                    {plan.executionResults.length > 0 && (
                      <>
                        <span>
                          {
                            plan.executionResults.filter(({ status }) => status === 'imported')
                              .length
                          }{' '}
                          imported
                        </span>
                        <span>
                          {
                            plan.executionResults.filter(({ status }) => status === 'ignored')
                              .length
                          }{' '}
                          ignored
                        </span>
                        <span>
                          {
                            plan.executionResults.filter(({ status }) => status === 'blocked')
                              .length
                          }{' '}
                          blocked
                        </span>
                        <span>
                          {plan.executionResults.filter(({ status }) => status === 'failed').length}{' '}
                          failed
                        </span>
                        {plan.executionResults.some(({ status }) => status === 'failed') && (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={isExecuting}
                            onClick={() =>
                              executeSelected({
                                [plan.sourceId]: new Set(
                                  plan.executionResults
                                    .filter(({ status }) => status === 'failed')
                                    .map(({ recordKey }) => recordKey)
                                ),
                              })
                            }
                          >
                            Retry failed
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {plan.status === 'ready' && plan.candidates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    {plan.candidates.slice(0, 5).map((candidate) => (
                      <span
                        key={`${candidate.provenance.sourceId}:${candidate.provenance.externalId}`}
                      >
                        {candidate.label}
                      </span>
                    ))}
                    {plan.candidates.length > 5 && <span>+{plan.candidates.length - 5} more</span>}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
      {typeSetupSource && typeSetupPlan && (
        <TypeSetupDialog
          source={typeSetupSource as ImportAllPlanSource}
          plan={typeSetupPlan}
          open={typeSetupSourceId !== null}
          onCreateAutomatically={() => createMissingTypes([typeSetupPlan])}
          canWrite={canWrite}
          requestContextReload={runtime.requestContextReload}
          allowManualTypeSetup={allowManualTypeSetup}
          onOpenChange={(open) => {
            if (!open) setTypeSetupSourceId(null)
          }}
        />
      )}
    </div>
  )
}

const ImportAllPage = (options: ImportAllPageOptions = {}): ReactElement => {
  const auth = useAuth()
  const [, requestContextReload] = useAtom(requestContextReloadAtom)
  const token = auth.user?.access_token ?? ''
  return (
    <ImportAllView
      {...options}
      token={token}
      canWrite={Boolean(token)}
      runtime={{ ...productionRuntime, requestContextReload }}
    />
  )
}

export default ImportAllPage
