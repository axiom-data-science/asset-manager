import { useMemo, useRef, useState, type ReactElement } from 'react'
import { Check, CircleAlert, LoaderCircle, Search, ShieldCheck, Square, X } from 'lucide-react'
import { Checkbox, Input, Tabs } from '@axdspub/axiom-ui-utilities'
import { schemaToFormUtils, type IFormValues } from '@axdspub/axiom-ui-forms'
import { Button } from '@/components/ui/button'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import importConfigs from '../config'
import type { ImportSourceAdapter } from '../types'
import type { IImportPageProps } from './import_records_page_impl'
import {
  createImportAllSourcePlan,
  collectImportDocumentUuids,
  collectImportAllErrors,
  discoverImportAllSource,
  executeImportAllSource,
  importAllRecordKey,
  prepareImportAllSource,
  refreshImportAllSourceReconciliation,
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
import { IMPORT_MERGE_RPC } from '@/config/config'
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
import { postObjectType } from '@/manage/object_type/services'
import { postObjectSchema } from '@/manage/object_schema/services'
import {
  findEnumProperties,
  removeAllEnumAtPath,
} from './select_object_type_for_import/schema_enum_utils'
import { quicktypeJSON } from './select_object_type_for_import'

const configuredSources = importConfigs.filter(
  (config): config is IImportPageProps & { sourceAdapter: ImportSourceAdapter } =>
    config.sourceAdapter !== undefined
)

const sourcesById = Object.fromEntries(
  configuredSources.map((source) => [source.sourceAdapter.id, source])
)

const initialPlans = (): Record<string, ImportAllSourcePlan> =>
  Object.fromEntries(
    configuredSources.map((source) => [
      source.sourceAdapter.id,
      createImportAllSourcePlan(source as ImportAllPlanSource),
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
            const documentLink = uuid ?? (execution?.status === 'failed' ? record?.slug ?? candidate.slug : undefined)
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
                    <Link className="shrink-0 text-blue-700 hover:underline" to={`/document/edit/${documentLink}`}>
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

const createAutomaticType = async ({
  source,
  plan,
  token,
}: {
  source: ImportAllPlanSource
  plan: ImportAllSourcePlan
  token: string
}) => {
  const generated = await quicktypeJSON(
    'json-schema',
    source.type,
    plan.records.map((record) => JSON.stringify(record.data))
  )
  const generatedSchema = JSON.parse(generated.lines.join('\n')) as JSONSchema6
  const enumPaths = findEnumProperties(generatedSchema).map(({ path }) => path)
  const schema = source.sourceAdapter.schema ?? removeAllEnumAtPath(generatedSchema, enumPaths)
  const objectType = await postObjectType({
    object_type: {
      category: 'document',
      label: source.label,
      slug: source.type,
    },
    token,
  })
  await postObjectSchema({
    object_schema: {
      object_type_uuid: objectType.uuid,
      label: `${source.label} default schema`,
      slug: `${source.type}_default`,
      description: `Automatically generated from ${source.label} import records.`,
      version: 1,
      is_type_default: true,
      json_schema: schema as Record<string, unknown>,
    },
    token,
  })
  return objectType
}

const TypeSetupDialog = ({
  source,
  plan,
  open,
  onOpenChange,
}: {
  source: ImportAllPlanSource
  plan: ImportAllSourcePlan
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement => {
  const { session } = useImportSession(plan.sourceId)
  const auth = useAuth()
  const [, requestContextReload] = useAtom(requestContextReloadAtom)
  const [automaticCreateState, setAutomaticCreateState] = useState<'idle' | 'creating' | 'error'>(
    'idle'
  )
  const [automaticCreateError, setAutomaticCreateError] = useState<string | undefined>()

  const createAutomaticTypeForSource = async () => {
    if (!plan.records.length || !auth.user?.access_token) return
    setAutomaticCreateState('creating')
    setAutomaticCreateError(undefined)
    try {
      await createAutomaticType({ source, plan, token: auth.user.access_token })
      requestContextReload()
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
        <div className="grid min-h-0 gap-6 lg:grid-cols-2">
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
            {session.schema ? (
              <CreateObjectType
                initialSchema={session.schema}
                initialLabel={source.label}
                onSuccess={() => {
                  requestContextReload()
                  onOpenChange(false)
                }}
              />
            ) : (
              <p className="text-sm text-gray-600">
                Select or infer a schema first. The type form will appear here when a schema is
                ready.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ImportAllPage = (): ReactElement => {
  const [context] = useAtom(contextStateAtom)
  const [, requestContextReload] = useAtom(requestContextReloadAtom)
  const auth = useAuth()
  const [plans, setPlans] = useState(initialPlans)
  const [loadAllRecords, setLoadAllRecords] = useState(false)
  const [recordLimit, setRecordLimit] = useState(100)
  const [relationshipResults, setRelationshipResults] = useState<
    ImportRelationshipPersistenceResult[]
  >([])
  const [isPersistingRelationships, setIsPersistingRelationships] = useState(false)
  const [typeSetupSourceId, setTypeSetupSourceId] = useState<string | null>(null)
  const [isCreatingMissingTypes, setIsCreatingMissingTypes] = useState(false)
  const [missingTypeCreationError, setMissingTypeCreationError] = useState<string>()
  const [activeView, setActiveView] = useState<'plan' | 'errors'>('plan')
  const relationshipRetryRef = useRef<{
    plans: ImportRelationshipPlan[]
    documentUuids: Map<string, string>
    predicateUuids: Map<string, string>
  } | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const planList = useMemo(() => Object.values(plans), [plans])
  const summary = useMemo(() => summarizeImportAllPlan(planList), [planList])
  const relationshipRules = useMemo(
    () =>
      planList
        .filter(({ enabled }) => enabled)
        .flatMap(({ sourceId }) => sourcesById[sourceId]?.sourceAdapter.relationshipRules ?? []),
    [planList]
  )
  const relationshipPlans = useMemo(
    () =>
      planImportRelationships({
        parentObjectTypes: new Map(
          Object.values(context.object_type_by_slug).map((objectType) => [
            objectType.uuid,
            objectType,
          ])
        ),
        relationshipRules,
        candidates: planList.flatMap((plan) => {
          const objectType = context.object_type_by_slug[plan.type]
          return objectType
            ? plan.records.map((record) => ({
              record,
              objectTypeUuid: objectType.uuid,
              objectTypeSlug: objectType.slug,
            }))
            : []
        }),
      }),
    [context.object_type_by_slug, planList, relationshipRules]
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

  const updatePlan = (sourceId: string, update: Partial<ImportAllSourcePlan>) => {
    setPlans((current) => ({
      ...current,
      [sourceId]: { ...current[sourceId], ...update },
    }))
  }

  const createMissingTypes = async () => {
    const missingTypePlans = enabledPlans.filter(
      (plan) => !context.object_type_by_slug[plan.type] && plan.records.length > 0
    )
    if (!missingTypePlans.length || !auth.user?.access_token) return
    setIsCreatingMissingTypes(true)
    setMissingTypeCreationError(undefined)
    try {
      for (const plan of missingTypePlans) {
        const source = sourcesById[plan.sourceId]
        if (!source) continue
        await createAutomaticType({
          source: source as ImportAllPlanSource,
          plan,
          token: auth.user.access_token,
        })
      }
      requestContextReload()
    } catch (error) {
      setMissingTypeCreationError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsCreatingMissingTypes(false)
    }
  }

  const persistRelationships = async (plans: ImportRelationshipPlan[]) => {
    const retryContext = relationshipRetryRef.current
    if (!retryContext) return
    setIsPersistingRelationships(true)
    try {
      const results = await persistImportRelationships({
        plans,
        documentUuids: retryContext.documentUuids,
        predicateUuids: retryContext.predicateUuids,
        signal: controllerRef.current?.signal ?? new AbortController().signal,
        post: (relationship, signal) =>
          postRelationship({
            relationship,
            token: auth.user?.access_token ?? '',
            signal,
          }),
        findExisting: async (relationship, signal) =>
          (
            await fetchRelationships({
              token: auth.user?.access_token ?? '',
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
      })
      setRelationshipResults((current) => [
        ...current.filter(
          ({ relationshipKey }) =>
            !results.some((result) => result.relationshipKey === relationshipKey)
        ),
        ...results,
      ])
    } finally {
      setIsPersistingRelationships(false)
    }
  }

  const discoverSelected = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setRelationshipResults([])
    relationshipRetryRef.current = null
    const selected = Object.values(plans).filter(({ enabled }) => enabled)

    setPlans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sourceId, plan]) => [
          sourceId,
          plan.enabled
            ? {
              ...plan,
              status: 'loading',
              preparationStatus: 'idle',
              candidates: [],
              records: [],
              validationResults: [],
              reconciliations: [],
              error: undefined,
            }
            : plan,
        ])
      )
    )

    await Promise.all(
      selected.map(async (plan) => {
        const source = sourcesById[plan.sourceId]
        if (!source) return
        try {
          const result = await discoverImportAllSource({
            source: source as ImportAllPlanSource,
            plan,
            limit: loadAllRecords ? undefined : recordLimit,
            signal: controller.signal,
          })
          if (!controller.signal.aborted) updatePlan(plan.sourceId, result)
        } catch {
          if (!controller.signal.aborted) {
            updatePlan(plan.sourceId, {
              status: 'error',
              candidates: [],
              error: 'Discovery was cancelled before this source completed.',
            })
          }
        }
      })
    )

    if (controllerRef.current === controller) controllerRef.current = null
  }

  const cancelDiscovery = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setPlans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sourceId, plan]) => [
          sourceId,
          plan.status === 'loading' || plan.preparationStatus === 'loading'
            ? {
              ...plan,
              status: plan.status === 'loading' ? 'idle' : plan.status,
              preparationStatus:
                plan.preparationStatus === 'loading' ? 'idle' : plan.preparationStatus,
            }
            : plan,
        ])
      )
    )
  }

  const prepareSelected = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setRelationshipResults([])
    relationshipRetryRef.current = null
    const selected = Object.values(plans).filter(
      ({ enabled, status }) => enabled && status === 'ready'
    )

    let freshObjectTypes = Object.values(context.object_type_by_slug)
    let freshObjectSchemas = Object.values(context.object_schema_defaults_by_object_type_uuid)
    try {
      const [objectTypes, objectSchemas] = await Promise.all([
        fetchObjectTypes({ token: auth.user?.access_token ?? '', signal: controller.signal }),
        fetchObjectSchemas({ token: auth.user?.access_token ?? '', signal: controller.signal }),
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
      return
    }
    const objectTypesBySlug = Object.fromEntries(freshObjectTypes.map((type) => [type.slug, type]))
    const defaultSchemasByTypeUuid = Object.fromEntries(
      freshObjectSchemas.map((schema) => [schema.object_type_uuid, schema])
    )

    setPlans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sourceId, plan]) => [
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
    )

    await Promise.all(
      selected.map(async (plan) => {
        const source = sourcesById[plan.sourceId]
        const objectType = objectTypesBySlug[plan.type]
        const schema = objectType
          ? defaultSchemasByTypeUuid[objectType.uuid]?.json_schema
          : undefined
        if (!source) return
        try {
          const prepared = await prepareImportAllSource({
            source: source as ImportAllPlanSource,
            plan,
            schema: schema as JSONSchema6 | undefined,
            objectTypeUuid: objectType?.uuid,
            token: auth.user?.access_token ?? '',
            signal: controller.signal,
            validator: validateRecord,
            fetchExisting: fetchExistingImportDocuments,
            batchSize: 10,
            onProgress: (completed, total) =>
              updatePlan(plan.sourceId, {
                preparationCompleted: completed,
                preparationTotal: total,
              }),
          })
          if (!controller.signal.aborted) updatePlan(plan.sourceId, prepared)
        } catch {
          if (!controller.signal.aborted) {
            updatePlan(plan.sourceId, {
              preparationStatus: 'error',
              error: 'Preparation was cancelled before this source completed.',
            })
          }
        }
      })
    )

    if (controllerRef.current === controller) controllerRef.current = null
  }

  const executeSelected = async (recordKeysBySource?: Record<string, ReadonlySet<string>>) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setRelationshipResults([])
    relationshipRetryRef.current = null
    const selected = Object.values(plans).filter(
      ({ sourceId, enabled, preparationStatus }) =>
        enabled &&
        preparationStatus === 'ready' &&
        (!recordKeysBySource || recordKeysBySource[sourceId] !== undefined)
    )
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
    setPlans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sourceId, plan]) => [
          sourceId,
          plan.enabled &&
            plan.preparationStatus === 'ready' &&
            (!recordKeysBySource || recordKeysBySource[plan.sourceId] !== undefined)
            ? { ...plan, executionStatus: 'loading', error: undefined }
            : plan,
        ])
      )
    )

    const executedPlans: ImportAllSourcePlan[] = []
    await Promise.all(
      selected.map(async (plan) => {
        const objectType = context.object_type_by_slug[plan.type]
        if (!objectType) {
          if (!controller.signal.aborted) {
            updatePlan(plan.sourceId, {
              executionStatus: 'error',
              error: `Object type "${plan.type}" was not available when execution started. Prepare the plan again.`,
            })
          }
          return
        }
        try {
          const recordKeys = recordKeysBySource?.[plan.sourceId]
          const needsReconciliation = plan.reconciliations.length !== plan.records.length
          const executionPlan = recordKeys || needsReconciliation
            ? await refreshImportAllSourceReconciliation({
              plan,
              recordKeys: recordKeys ?? new Set(plan.records.map((record) => importAllRecordKey(record))),
              objectTypeUuid: objectType.uuid,
              token: auth.user?.access_token ?? '',
              signal: controller.signal,
              fetchExisting: fetchExistingImportDocuments,
            })
            : plan
          const executed = await executeImportAllSource({
            plan: executionPlan,
            objectTypeUuid: objectType.uuid,
            signal: controller.signal,
            mergeStrategy: 'client-patch',
            recordKeys: recordKeysBySource?.[plan.sourceId],
            persistence: {
              post: (document, signal) =>
                postDocument({ document, token: auth.user?.access_token ?? '', signal }),
              patch: (uuid, document, signal) =>
                patchDocument({ uuid, document, token: auth.user?.access_token ?? '', signal }),
              mergeRpc: (uuid, document, signal) =>
                mergeImportDocumentViaRpc({
                  rpcPath: IMPORT_MERGE_RPC,
                  documentUuid: uuid,
                  incomingDocument: document,
                  token: auth.user?.access_token ?? '',
                  signal,
                }),
              fetchBySlug: (slug, objectTypeUuid, signal) =>
                fetchExistingDocumentBySlug({
                  slug,
                  objectTypeUuid,
                  token: auth.user?.access_token ?? '',
                  signal,
                }),
            },
          })
          executedPlans.push(executed)
          if (!controller.signal.aborted)
            updatePlan(plan.sourceId, {
              ...executed,
              executionResults: [
                ...plan.executionResults.filter(
                  ({ recordKey }) =>
                    !executed.executionResults.some((result) => result.recordKey === recordKey)
                ),
                ...executed.executionResults,
              ],
            })
        } catch (error) {
          if (!controller.signal.aborted)
            updatePlan(plan.sourceId, {
              executionStatus: 'error',
              error: error instanceof Error ? error.message : String(error),
            })
        }
      })
    )

    if (!recordKeysBySource && !controller.signal.aborted) {
      if (executedPlans.length !== selected.length) {
        setRelationshipResults([])
        if (controllerRef.current === controller) controllerRef.current = null
        return
      }
      const documentUuids = collectImportDocumentUuids({
        executedPlans,
        objectTypesBySlug: context.object_type_by_slug,
      })
      for (const executed of executedPlans) {
        const objectType = context.object_type_by_slug[executed.type]
        if (!objectType) continue
        const documents = await fetchExistingImportDocuments({
          records: executed.records,
          objectTypeUuid: objectType.uuid,
          token: auth.user?.access_token ?? '',
          signal: controller.signal,
        })
        const documentsBySlug = new Map(documents.map((document) => [document.slug, document]))
        const documentsByExternalId = new Map(
          documents
            .map((document) => [getDocumentImportProvenance(document)?.external_id, document] as const)
            .filter(([externalId]) => externalId !== undefined)
        )
        for (const record of executed.records) {
          const document =
            documentsByExternalId.get(record.provenance.externalId) ??
            documentsBySlug.get(record.slug)
          if (!document) continue
          documentUuids.set(
            relationshipDocumentKey({
              record,
              objectTypeUuid: objectType.uuid,
              objectTypeSlug: objectType.slug,
            }),
            document.uuid
          )
        }
      }
      const predicateUuids = new Map(
        [
          ...Object.values(context.predicate_by_predicate),
          ...Object.values(context.predicate_by_uuid),
        ].map((predicate) => [predicate.predicate, predicate.uuid])
      )
      const results = await persistImportRelationships({
        plans: relationshipPlans,
        documentUuids,
        predicateUuids,
        signal: controller.signal,
        post: (relationship, signal) =>
          postRelationship({
            relationship,
            token: auth.user?.access_token ?? '',
            signal,
          }),
        findExisting: async (relationship, signal) =>
          (
            await fetchRelationships({
              token: auth.user?.access_token ?? '',
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
      })
      relationshipRetryRef.current = {
        plans: relationshipPlans,
        documentUuids,
        predicateUuids,
      }
      setRelationshipResults(results)
    }

    if (controllerRef.current === controller) controllerRef.current = null
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="sticky top-0 z-10 flex flex-wrap items-end gap-4 border-b bg-white px-5 py-4">
        <div className="min-w-52 grow">
          <h1 className="text-xl font-semibold">Import All Sources</h1>
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
          </div>
        </div>
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
        {isDiscovering || isPreparing || isExecuting ? (
          <Button variant="destructive" onClick={cancelDiscovery}>
            <X size={16} /> Cancel
          </Button>
        ) : (
          <Button disabled={enabledPlans.length === 0} onClick={discoverSelected}>
            <Search size={16} /> Discover selected
          </Button>
        )}
        <Button
          variant="outline"
          disabled={isDiscovering || isPreparing || !discoveryReady || !auth.user?.access_token}
          onClick={prepareSelected}
        >
          <ShieldCheck size={16} /> Prepare review
        </Button>
        <Button
          variant="outline"
          disabled={
            isDiscovering ||
            isPreparing ||
            isCreatingMissingTypes ||
            missingTypes.length === 0 ||
            missingTypes.some((plan) => plan.records.length === 0) ||
            !auth.user?.access_token
          }
          onClick={() => void createMissingTypes()}
        >
          {isCreatingMissingTypes ? 'Creating types...' : 'Create missing types'}
        </Button>
        <Button
          disabled={
            isDiscovering || isPreparing || isExecuting || !reviewReady || !auth.user?.access_token
          }
          onClick={() => executeSelected()}
        >
          <Check size={16} /> Execute import
        </Button>
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
              {relationshipResults.some(({ status }) => status === 'failed') && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={isExecuting || isPersistingRelationships}
                  onClick={() => {
                    const failedKeys = new Set(
                      relationshipResults
                        .filter(({ status }) => status === 'failed')
                        .map(({ relationshipKey }) => relationshipKey)
                    )
                    const failedPlans =
                      relationshipRetryRef.current?.plans.filter((plan) =>
                        failedKeys.has(importRelationshipKey(plan))
                      ) ?? []
                    void persistRelationships(failedPlans)
                  }}
                >
                  Retry failed links
                </Button>
              )}
            </>
          )}
          {reviewReady && <span className="text-green-700">Ready for execution review</span>}
        </div>
        {missingTypeCreationError && (
          <div className="mt-2 text-sm text-red-700" role="alert">
            Could not create missing types: {missingTypeCreationError}
          </div>
        )}
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
          {configuredSources.map((source, index) => {
            const plan = plans[source.sourceAdapter.id]
            const objectType = context.object_type_by_slug[source.type]
            const Icon = source.icon
            const hasChangedRecords =
              plan.preparationStatus === 'ready' &&
              plan.reconciliations.some(({ status }) => status === 'conflicting')
            return (
              <section
                key={source.sourceAdapter.id}
                className={`relative border-b px-5 py-4 lg:pr-104 ${plan.enabled ? 'lg:min-h-96' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="grid grid-cols-[minmax(15rem,1fr)_9rem_11rem_auto] items-center gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      id={`plan-${source.type}`}
                      testId={`plan-${source.type}`}
                      value={plan.enabled}
                      onChange={(enabled) =>
                        updatePlan(plan.sourceId, {
                          enabled,
                          status: enabled ? plan.status : 'idle',
                          preparationStatus: enabled ? plan.preparationStatus : 'idle',
                        })
                      }
                    />
                    <Icon className="shrink-0 text-gray-700" size={20} />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{source.label}</strong>
                      <span className="block truncate text-xs text-gray-500">{source.type}</span>
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
                        onChange={(importUrl) =>
                          updatePlan(plan.sourceId, {
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
                      <span>
                        {plan.preparationCompleted} of {plan.preparationTotal} records loaded
                      </span>
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
                                        const action = event.target.value as 'ignore' | 'overwrite' | 'merge'
                                        if (!action) return
                                        const conflictActions = Object.fromEntries(
                                          plan.reconciliations
                                            .filter(({ status }) => status === 'conflicting')
                                            .map(({ record }) => [importAllRecordKey(record), action])
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
                                      Table: (props) => <table {...props} className="w-full table-fixed" />,
                                    }}
                                    data={plan.reconciliations.filter(({ status }) => status === 'conflicting')}
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
                                              value={plan.conflictActions[key] ?? plan.defaultConflictAction}
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
          onOpenChange={(open) => {
            if (!open) setTypeSetupSourceId(null)
          }}
        />
      )}
    </div>
  )
}

export default ImportAllPage
