import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { Loader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import type { CanonicalImportRecord } from ***REMOVED***@/import/types***REMOVED***
import type {
    ImportConflictAction,
    ImportMergeStrategy,
    ImportReconciliation,
} from ***REMOVED***@/import/reconciliation***REMOVED***
import { reconcileImportRecords } from ***REMOVED***@/import/reconciliation***REMOVED***
import { fetchExistingImportDocuments } from ***REMOVED***@/import/reconciliation_service***REMOVED***

const existingActions: ImportConflictAction[] = [***REMOVED***ignore***REMOVED***, ***REMOVED***overwrite***REMOVED***, ***REMOVED***merge***REMOVED***]

const ReconciliationReview = ({
    records,
    objectTypeUuid,
    token,
    reconciliations,
    mergeStrategy,
    serverMergeAvailable,
    onReconciled,
    onActionChange,
    onMergeStrategyChange,
}: {
    records: CanonicalImportRecord[]
    objectTypeUuid: string
    token: string
    reconciliations: ImportReconciliation[] | null
    mergeStrategy: ImportMergeStrategy
    serverMergeAvailable: boolean
    onReconciled: (reconciliations: ImportReconciliation[]) => void
    onActionChange: (record: CanonicalImportRecord, action: ImportConflictAction) => void
    onMergeStrategyChange: (strategy: ImportMergeStrategy) => void
}): ReactElement => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const discoverDuplicates = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const existingDocuments = await fetchExistingImportDocuments({
                records,
                objectTypeUuid,
                token,
            })
            onReconciled(reconcileImportRecords(records, existingDocuments))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught))
        } finally {
            setIsLoading(false)
        }
    }

    const applyToExisting = (action: ImportConflictAction) => {
        reconciliations
            ?.filter(({ status }) => status === ***REMOVED***exact***REMOVED*** || status === ***REMOVED***conflicting***REMOVED***)
            .forEach(({ record }) => onActionChange(record, action))
    }

    const counts = reconciliations?.reduce<Record<string, number>>((summary, item) => {
        summary[item.status] = (summary[item.status] ?? 0) + 1
        return summary
    }, {})
    const existing = reconciliations?.filter(({ status }) => status !== ***REMOVED***new***REMOVED***) ?? []

    return (
        <section className="flex flex-col gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
                <Button size="xs" disabled={isLoading || !token} onClick={discoverDuplicates}>
                    {isLoading ? <Loader size="sm" /> : reconciliations ? ***REMOVED***Check again***REMOVED*** : ***REMOVED***Check existing documents***REMOVED***}
                </Button>
                {!token && <span className="text-sm text-red-700">Sign in to check existing documents.</span>}
                {error && <span className="text-sm text-red-700">{error}</span>}
            </div>

            {reconciliations && (
                <>
                    <div className="flex flex-wrap gap-3 text-sm" role="status">
                        <span>{counts?.new ?? 0} new</span>
                        <span>{counts?.exact ?? 0} already identical</span>
                        <span>{counts?.conflicting ?? 0} changed</span>
                        <span className={(counts?.ambiguous ?? 0) > 0 ? ***REMOVED***text-red-700***REMOVED*** : ***REMOVED******REMOVED***}>
                            {counts?.ambiguous ?? 0} ambiguous
                        </span>
                    </div>

                    {existing.length > 0 && (
                        <div className="flex gap-2">
                            <Button size="xs" variant="outline" onClick={() => applyToExisting(***REMOVED***ignore***REMOVED***)}>
                                Ignore all existing
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => applyToExisting(***REMOVED***merge***REMOVED***)}>
                                Merge all existing
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => applyToExisting(***REMOVED***overwrite***REMOVED***)}>
                                Overwrite all existing
                            </Button>
                        </div>
                    )}

                    {existing.some(({ status }) => status === ***REMOVED***conflicting***REMOVED***) && (
                        <div className="flex flex-wrap items-end gap-3 text-sm">
                            <label className="flex flex-col gap-1">
                                <span>Merge execution</span>
                                <select
                                    className="h-8 border bg-white px-2"
                                    value={mergeStrategy}
                                    onChange={(event) =>
                                        onMergeStrategyChange(event.target.value as ImportMergeStrategy)
                                    }
                                >
                                    <option value="client-patch">Client deep merge + PATCH</option>
                                    <option value="postgrest-rpc" disabled={!serverMergeAvailable}>
                                        Atomic PostgREST RPC
                                    </option>
                                </select>
                            </label>
                            {!serverMergeAvailable && (
                                <span className="text-gray-600">
                                    Configure the import merge RPC to enable server-side merge.
                                </span>
                            )}
                        </div>
                    )}

                    {existing.length > 0 && (
                        <div className="max-h-64 overflow-auto border">
                            {existing.map((item) => (
                                <div
                                    key={`${item.record.provenance.sourceId}:${item.record.provenance.externalId}`}
                                    className="grid grid-cols-[minmax(0,1fr)_8rem_10rem] items-center gap-3 px-3 py-2 even:bg-gray-50 text-sm"
                                >
                                    <span className="truncate">{item.record.label}</span>
                                    <span>{item.status}</span>
                                    {item.status === ***REMOVED***ambiguous***REMOVED*** ? (
                                        <span className="text-red-700">Needs manual resolution</span>
                                    ) : (
                                        <select
                                            className="h-8 border bg-white px-2"
                                            aria-label={`Conflict action for ${item.record.label}`}
                                            value={item.action}
                                            onChange={(event) =>
                                                onActionChange(item.record, event.target.value as ImportConflictAction)
                                            }
                                        >
                                            {existingActions.map((action) => (
                                                <option key={action} value={action}>{action}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}

export default ReconciliationReview
