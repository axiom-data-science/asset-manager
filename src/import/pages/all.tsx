import { useMemo, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Link } from ***REMOVED***react-router-dom***REMOVED***
import { Check, CircleAlert, LoaderCircle, Search, ShieldCheck, Square, X } from ***REMOVED***lucide-react***REMOVED***
import { Checkbox, Input } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { schemaToFormUtils, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import contextStateAtom from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import importConfigs from ***REMOVED***../config***REMOVED***
import type { ImportSourceAdapter } from ***REMOVED***../types***REMOVED***
import type { IImportPageProps } from ***REMOVED***./import_records_page_impl***REMOVED***
import {
    createImportAllSourcePlan,
    discoverImportAllSource,
    prepareImportAllSource,
    summarizeImportAllPlan,
    type ImportAllPlanSource,
    type ImportAllSourcePlan,
} from ***REMOVED***../import_all_plan***REMOVED***
import { fetchExistingImportDocuments } from ***REMOVED***../reconciliation_service***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***

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

const statusIcon = (status: ImportAllSourcePlan[***REMOVED***status***REMOVED***]) => {
    if (status === ***REMOVED***loading***REMOVED***) return <LoaderCircle className="animate-spin" size={16} />
    if (status === ***REMOVED***ready***REMOVED***) return <Check className="text-green-700" size={16} />
    if (status === ***REMOVED***error***REMOVED***) return <CircleAlert className="text-red-700" size={16} />
    return <Square className="text-gray-400" size={14} />
}

const validateRecord = (schema: JSONSchema6, record: ImportAllSourcePlan[***REMOVED***records***REMOVED***][number]) => {
    const errors = schemaToFormUtils.validateAgainstSchema(
        omit(schema as Record<string, unknown>, ***REMOVED***$schema***REMOVED***),
        record.data as IFormValues
    )
    return {
        isValid: !errors?.length,
        errors: errors?.map((error) => error.message) ?? [],
    }
}

const ImportAllPage = (): ReactElement => {
    const [context] = useAtom(contextStateAtom)
    const auth = useAuth()
    const [plans, setPlans] = useState(initialPlans)
    const [loadAllRecords, setLoadAllRecords] = useState(false)
    const [recordLimit, setRecordLimit] = useState(100)
    const controllerRef = useRef<AbortController | null>(null)

    const planList = useMemo(() => Object.values(plans), [plans])
    const summary = useMemo(() => summarizeImportAllPlan(planList), [planList])
    const isDiscovering = planList.some(({ status }) => status === ***REMOVED***loading***REMOVED***)
    const isPreparing = planList.some(({ preparationStatus }) => preparationStatus === ***REMOVED***loading***REMOVED***)
    const enabledPlans = planList.filter(({ enabled }) => enabled)
    const missingTypes = enabledPlans.filter((plan) => !context.object_type_by_slug[plan.type])
    const missingSchemas = enabledPlans.filter((plan) => {
        const objectType = context.object_type_by_slug[plan.type]
        return objectType && !context.object_schema_defaults_by_object_type_uuid[objectType.uuid]
    })
    const discoveryReady =
        enabledPlans.length > 0 && enabledPlans.every(({ status }) => status === ***REMOVED***ready***REMOVED***)
    const reviewReady =
        discoveryReady &&
        enabledPlans.every(({ preparationStatus }) => preparationStatus === ***REMOVED***ready***REMOVED***) &&
        missingTypes.length === 0 &&
        missingSchemas.length === 0

    const updatePlan = (sourceId: string, update: Partial<ImportAllSourcePlan>) => {
        setPlans((current) => ({
            ...current,
            [sourceId]: { ...current[sourceId], ...update },
        }))
    }

    const discoverSelected = async () => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const selected = Object.values(plans).filter(({ enabled }) => enabled)

        setPlans((current) => Object.fromEntries(
            Object.entries(current).map(([sourceId, plan]) => [
                sourceId,
                plan.enabled
                    ? {
                        ...plan,
                        status: ***REMOVED***loading***REMOVED***,
                        preparationStatus: ***REMOVED***idle***REMOVED***,
                        candidates: [],
                        records: [],
                        validationResults: [],
                        reconciliations: [],
                        error: undefined,
                    }
                    : plan,
            ])
        ))

        await Promise.all(selected.map(async (plan) => {
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
                        status: ***REMOVED***error***REMOVED***,
                        candidates: [],
                        error: ***REMOVED***Discovery was cancelled before this source completed.***REMOVED***,
                    })
                }
            }
        }))

        if (controllerRef.current === controller) controllerRef.current = null
    }

    const cancelDiscovery = () => {
        controllerRef.current?.abort()
        controllerRef.current = null
        setPlans((current) => Object.fromEntries(
            Object.entries(current).map(([sourceId, plan]) => [
                sourceId,
                plan.status === ***REMOVED***loading***REMOVED*** || plan.preparationStatus === ***REMOVED***loading***REMOVED***
                    ? {
                        ...plan,
                        status: plan.status === ***REMOVED***loading***REMOVED*** ? ***REMOVED***idle***REMOVED*** : plan.status,
                        preparationStatus: plan.preparationStatus === ***REMOVED***loading***REMOVED*** ? ***REMOVED***idle***REMOVED*** : plan.preparationStatus,
                    }
                    : plan,
            ])
        ))
    }

    const prepareSelected = async () => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const selected = Object.values(plans).filter(({ enabled, status }) => enabled && status === ***REMOVED***ready***REMOVED***)

        setPlans((current) => Object.fromEntries(
            Object.entries(current).map(([sourceId, plan]) => [
                sourceId,
                plan.enabled && plan.status === ***REMOVED***ready***REMOVED***
                    ? { ...plan, preparationStatus: ***REMOVED***loading***REMOVED***, error: undefined }
                    : plan,
            ])
        ))

        await Promise.all(selected.map(async (plan) => {
            const source = sourcesById[plan.sourceId]
            const objectType = context.object_type_by_slug[plan.type]
            const schema = objectType
                ? context.object_schema_defaults_by_object_type_uuid[objectType.uuid]?.json_schema
                : undefined
            if (!source || !objectType || !schema) return

            try {
                const prepared = await prepareImportAllSource({
                    source: source as ImportAllPlanSource,
                    plan,
                    schema: schema as JSONSchema6,
                    objectTypeUuid: objectType.uuid,
                    token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                    signal: controller.signal,
                    validator: validateRecord,
                    fetchExisting: fetchExistingImportDocuments,
                })
                if (!controller.signal.aborted) updatePlan(plan.sourceId, prepared)
            } catch {
                if (!controller.signal.aborted) {
                    updatePlan(plan.sourceId, {
                        preparationStatus: ***REMOVED***error***REMOVED***,
                        error: ***REMOVED***Preparation was cancelled before this source completed.***REMOVED***,
                    })
                }
            }
        }))

        if (controllerRef.current === controller) controllerRef.current = null
    }

    return (
        <div className="flex h-full flex-col bg-white">
            <header className="sticky top-0 z-10 flex flex-wrap items-end gap-4 border-b bg-white px-5 py-4">
                <div className="min-w-52 grow">
                    <h1 className="text-xl font-semibold">Import All Sources</h1>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>{summary.enabledSources} sources</span>
                        <span>{summary.records} records found</span>
                        <span>{summary.failedSources} source errors</span>
                        <span>{missingTypes.length} types need setup</span>
                        <span>{missingSchemas.length} schemas need setup</span>
                    </div>
                </div>
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
                {isDiscovering || isPreparing ? (
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
                    disabled={
                        isDiscovering ||
                        isPreparing ||
                        !discoveryReady ||
                        missingTypes.length > 0 ||
                        missingSchemas.length > 0 ||
                        !auth.user?.access_token
                    }
                    onClick={prepareSelected}
                >
                    <ShieldCheck size={16} /> Prepare review
                </Button>
            </header>

            <section className="border-b px-5 py-3" aria-label="Import plan status">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <strong>{reviewReady ? ***REMOVED***Plan prepared***REMOVED*** : ***REMOVED***Plan needs review***REMOVED***}</strong>
                    <span>{summary.readySources} of {summary.enabledSources} sources discovered</span>
                    <span>{summary.preparedSources} sources prepared</span>
                    <span>{summary.validRecords} valid</span>
                    <span>{summary.invalidRecords} invalid</span>
                    <span>{summary.conflicts} conflicts</span>
                    {reviewReady && <span className="text-green-700">Ready for execution review</span>}
                </div>
            </section>

            <div className="min-h-0 flex-1 overflow-auto">
                {configuredSources.map((source, index) => {
                    const plan = plans[source.sourceAdapter.id]
                    const objectType = context.object_type_by_slug[source.type]
                    const Icon = source.icon
                    return (
                        <section
                            key={source.sourceAdapter.id}
                            className={`border-b px-5 py-4 ${index % 2 === 0 ? ***REMOVED***bg-white***REMOVED*** : ***REMOVED***bg-gray-50***REMOVED***}`}
                        >
                            <div className="grid grid-cols-[minmax(15rem,1fr)_9rem_11rem_auto] items-center gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Checkbox
                                        id={`plan-${source.type}`}
                                        testId={`plan-${source.type}`}
                                        value={plan.enabled}
                                        onChange={(enabled) => updatePlan(plan.sourceId, {
                                            enabled,
                                            status: enabled ? plan.status : ***REMOVED***idle***REMOVED***,
                                            preparationStatus: enabled ? plan.preparationStatus : ***REMOVED***idle***REMOVED***,
                                        })}
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
                                    {plan.status === ***REMOVED***ready***REMOVED*** ? `${plan.candidates.length} records` : ***REMOVED***Not counted***REMOVED***}
                                </div>
                                <div className="flex justify-end gap-2">
                                    {!objectType && (
                                        <Link className="text-sm text-blue-700 underline" to={`/import/${source.type}`}>
                                            Set up type
                                        </Link>
                                    )}
                                    {objectType && <span className="text-sm text-green-700">{objectType.label}</span>}
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
                                            onChange={(importUrl) => updatePlan(plan.sourceId, {
                                                importUrl: importUrl ?? source.sourceAdapter.defaultImportUrl,
                                                status: ***REMOVED***idle***REMOVED***,
                                                preparationStatus: ***REMOVED***idle***REMOVED***,
                                                candidates: [],
                                                records: [],
                                                validationResults: [],
                                                reconciliations: [],
                                                error: undefined,
                                            })}
                                        />
                                    </div>
                                </details>
                            )}

                            {plan.error && (
                                <div className="mt-3 text-sm text-red-700" role="alert">{plan.error}</div>
                            )}

                            {plan.preparationStatus !== ***REMOVED***idle***REMOVED*** && (
                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                    <span className="inline-flex items-center gap-2">
                                        {statusIcon(plan.preparationStatus)} Preparation: {plan.preparationStatus}
                                    </span>
                                    {plan.preparationStatus === ***REMOVED***ready***REMOVED*** && (
                                        <>
                                            <span>{plan.records.length} loaded</span>
                                            <span>{plan.validationResults.filter(({ isValid }) => isValid).length} valid</span>
                                            <span>{plan.validationResults.filter(({ isValid }) => !isValid).length} invalid</span>
                                            <span>{plan.reconciliations.filter(({ status }) => status === ***REMOVED***new***REMOVED***).length} new</span>
                                            <span>{plan.reconciliations.filter(({ status }) => status === ***REMOVED***exact***REMOVED***).length} identical</span>
                                            <span>{plan.reconciliations.filter(({ status }) => status === ***REMOVED***conflicting***REMOVED***).length} changed</span>
                                            <span>{plan.reconciliations.filter(({ status }) => status === ***REMOVED***ambiguous***REMOVED***).length} ambiguous</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {plan.status === ***REMOVED***ready***REMOVED*** && plan.candidates.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                    {plan.candidates.slice(0, 5).map((candidate) => (
                                        <span key={`${candidate.provenance.sourceId}:${candidate.provenance.externalId}`}>
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
        </div>
    )
}

export default ImportAllPage
