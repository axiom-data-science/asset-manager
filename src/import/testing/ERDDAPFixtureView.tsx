import { useRef, useState } from 'react'
import { omit } from 'lodash-es'
import { schemaToFormUtils, type IFormValues } from '@axdspub/axiom-ui-forms'
import type { JSONSchema6 } from 'json-schema'
import importConfigs from '../config'
import {
    createImportAllSourcePlan,
    fanOutCompositeImportCandidates,
    loadCompositeImportRecords,
    prepareImportAllSource,
    type ImportAllPlanSource,
    type ImportAllSourcePlan,
} from '../import_all_plan'
import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from '../types'
import { erddapFixtureCatalogUrl } from './erddapFixture'

const datasetConfig = importConfigs.find(({ type }) => type === 'modl')
const variableConfig = importConfigs.find(({ type }) => type === 'modl_variable_metadata')
const compositeAdapter = datasetConfig?.compositeSourceAdapter
const memberConfigs = [datasetConfig, variableConfig].filter(
    (config): config is NonNullable<typeof config> & { sourceAdapter: ImportSourceAdapter } =>
        config?.sourceAdapter !== undefined
)

const validateRecord = (schema: JSONSchema6, record: CanonicalImportRecord) => {
    const errors = schemaToFormUtils.validateAgainstSchema(
        omit(schema as Record<string, unknown>, '$schema'),
        record.data as IFormValues
    )
    return { isValid: !errors?.length, errors: errors?.map(({ message }) => message) ?? [] }
}

export const ERDDAPFixtureView = () => {
    const [candidates, setCandidates] = useState<ImportCandidate[]>([])
    const [plans, setPlans] = useState<Record<string, ImportAllSourcePlan>>({})
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string>()
    const controllerRef = useRef<AbortController | undefined>(undefined)

    const discover = async () => {
        if (!compositeAdapter) throw new Error('The configured ERDDAP composite adapter is unavailable.')
        const controller = new AbortController()
        controllerRef.current = controller
        setBusy(true)
        setError(undefined)
        setPlans({})
        try {
            const found = await compositeAdapter.discover({
                url: erddapFixtureCatalogUrl,
                signal: controller.signal,
            })
            setCandidates(found)
        } catch (cause) {
            setCandidates([])
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            if (controllerRef.current === controller) setBusy(false)
        }
    }

    const prepare = async () => {
        if (!compositeAdapter || candidates.length === 0) return
        const controller = new AbortController()
        controllerRef.current = controller
        setBusy(true)
        setError(undefined)
        try {
            const candidateGroups = fanOutCompositeImportCandidates(
                candidates,
                compositeAdapter.memberSourceIds
            )
            const recordsBySource = await loadCompositeImportRecords({
                adapter: compositeAdapter,
                candidates,
                signal: controller.signal,
            })
            const preparedPlans: Record<string, ImportAllSourcePlan> = {}
            for (const config of memberConfigs) {
                const source = {
                    type: config.type,
                    label: config.label,
                    sourceAdapter: config.sourceAdapter,
                } satisfies ImportAllPlanSource
                const sourceId = config.sourceAdapter.id
                const plan = {
                    ...createImportAllSourcePlan(source),
                    candidates: candidateGroups[sourceId] ?? [],
                }
                preparedPlans[sourceId] = await prepareImportAllSource({
                    source,
                    plan,
                    schema: config.sourceAdapter.schema,
                    token: '',
                    signal: controller.signal,
                    validator: validateRecord,
                    fetchExisting: async ({ signal }) => {
                        signal?.throwIfAborted()
                        return []
                    },
                    preloadedRecords: recordsBySource[sourceId],
                })
            }
            setPlans(preparedPlans)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            if (controllerRef.current === controller) setBusy(false)
        }
    }

    const preparedRecords = Object.fromEntries(
        Object.entries(plans).map(([sourceId, plan]) => [sourceId, plan.records])
    )
    const schemaEvidence = Object.fromEntries(memberConfigs.map((config) => {
        const sourceId = config.sourceAdapter.id
        const plan = plans[sourceId]
        return [sourceId, {
            required: config.sourceAdapter.schema?.required ?? [],
            validation: plan?.validationResults.map(({ isValid, errors }) => ({ isValid, errors })) ?? [],
        }]
    }))

    return (
        <main className="mx-auto flex max-w-6xl flex-col gap-5 p-6">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <h1 className="text-xl font-semibold">ERDDAP fixture</h1>
                <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => void discover()}>
                        Discover selected
                    </button>
                    <button type="button" disabled={busy || candidates.length === 0} onClick={() => void prepare()}>
                        Prepare review
                    </button>
                </div>
            </header>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <section aria-label="Discovered ERDDAP candidates">
                <pre data-testid="erddap-candidates" className="overflow-auto text-sm">
                    {JSON.stringify(candidates, null, 2)}
                </pre>
            </section>
            <section aria-label="Prepared ERDDAP records">
                <pre data-testid="erddap-prepared-records" className="overflow-auto text-sm">
                    {JSON.stringify(preparedRecords, null, 2)}
                </pre>
            </section>
            <section aria-label="ERDDAP schema evidence">
                <pre data-testid="erddap-schema-evidence" className="overflow-auto text-sm">
                    {JSON.stringify(schemaEvidence, null, 2)}
                </pre>
            </section>
        </main>
    )
}