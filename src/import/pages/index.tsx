import type { IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { Checkbox, Input, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import { forwardRef, useCallback, useEffect, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { Check } from ***REMOVED***lucide-react***REMOVED***
import { useBatchImport } from ***REMOVED***../hooks/useBatchImport***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***@/import/types***REMOVED***

const TableComponentsOverride: TableComponents<IDocumentImport> = {
    Table: (props) => (
        <table
            {...props}
            className="w-full border-collapse text-left text-sm text-gray-600 dark:text-gray-300"
        />
    ),
    TableHead: forwardRef((props, ref) => (
        <thead
            {...props}
            ref={ref}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm"
        />
    )),
    TableRow: (props) => (
        <tr
            {...props}
            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700 transition-colors"
        />
    ),
    TableBody: forwardRef((props, ref) => <tbody {...props} ref={ref} />),
}

const Row = ({
    index,
    uuid,
    label,
    slug,
    imported,
    loading,
    selected,
    onChangeSelected,
}: {
    index: number
    uuid: string
    label: string
    slug: string
    data: unknown
    imported?: boolean
    loading?: boolean
    selected?: boolean
    onChangeSelected: (selected: boolean, index: number) => void
}) => {
    return (
        <>
            <td className="px-6 py-4">

                <Checkbox
                    id={`select-${uuid}`}
                    testId={`select-${uuid}`}
                    disabled={loading}
                    label={
                        <>
                            {label}
                            {imported && !loading && <Check className="inline-block ml-2 text-green-500" size={16} />}
                            {loading && <Loader className="w-10 inline-block -mb-1 ml-2" size="xs" />}
                        </>
                    }
                    value={!!selected}
                    onChange={(e) => {
                        onChangeSelected(e, index)
                    }}
                />

            </td>
            <td className="px-6 py-4">{slug}</td>
        </>
    )
}

const ImportRecords = ({
    documents,
    getFullDoc,
    detailRoot
}: {
    documents: IDocumentImport<unknown>[],
    getFullDoc: (props: {
        doc: IDocumentImport,
        url?: string,
        signal?: AbortSignal,
        serviceRoot?: string
    }) => Promise<IFullDocForImport>, detailRoot?: string
}) => {
    const initialData = documents.map((doc) => {
        return {
            ...doc,
            selected: true,
            imported: false,
            loading: false,
        }
    })
    const [data, setData] = useState(initialData)
    useEffect(() => {
        setData(initialData)
    }, [documents])

    const onChangeSelected = (selected: boolean, index: number) => {
        const newData = [...data]
        newData[index].selected = selected
        setData(newData)
    }

    const [startImport, setStartImport] = useState(false)
    const [batchSize, setBatchSize] = useState(1)

    const importOneRecord = useCallback(
        async (item: IDocumentImport<unknown>, { signal }: { signal: AbortSignal }) => {
            //console.log(item, signal)

            const fullDoc = await getFullDoc({ doc: item, signal, serviceRoot: detailRoot })
            await new Promise((resolve) => setTimeout(resolve, 50))
            console.log(fullDoc)
            return;

        },
        []
    )

    const isSelected = useCallback((row: (typeof data)[number]) => row.selected, [])
    const isAlreadyImported = useCallback((/* row: (typeof data)[number] */) => false, []) // allow re-import
    const importBatchItem = useCallback(
        async (row: (typeof data)[number], { signal }: { signal: AbortSignal }) => {
            await importOneRecord(row, { signal })
        },
        [importOneRecord]
    )

    const handleBatchStart = useCallback((batch: typeof data) => {
        const ids = new Set(batch.map((r) => r.uuid))
        setData((prev) => prev.map((r) => (ids.has(r.uuid) ? { ...r, loading: true } : r)))
    }, [])

    const handleBatchComplete = useCallback(
        (batch: typeof data, results: PromiseSettledResult<void>[]) => {
            const byId = new Map(batch.map((r, i) => [r.uuid, results[i]]))
            setData((prev) =>
                prev.map((r) => {
                    const result = byId.get(r.uuid)
                    if (!result) return r
                    if (result.status === ***REMOVED***fulfilled***REMOVED***) {
                        return { ...r, imported: true, selected: false, loading: false }
                    }
                    return { ...r, loading: false }
                })
            )
        },
        []
    )

    const handleDone = useCallback(() => {
        setStartImport(false)
    }, [])

    const { isRunning, progress, runError, cancel } = useBatchImport({
        enabled: startImport,
        items: data,
        batchSize,
        isSelected,
        isAlreadyImported,
        importItem: importBatchItem,
        onBatchStart: handleBatchStart,
        onBatchComplete: handleBatchComplete,
        onDone: handleDone,
    })

    return (
        <>
            <div className="flex flex-row gap-4 items-center mb-4">
                <Checkbox
                    id="select-all"
                    testId="select-all"
                    label="Select All"
                    value={!data.find((d) => !d.selected)}
                    onChange={(e) => {
                        const newData = data.map((d) => ({ ...d, selected: e }))
                        setData(newData)
                    }}
                />
                <div className="flex flex-row gap-2 items-center text-xs">
                    <span>Batch Size:</span>
                    <Input
                        id="batch-size"
                        testId="batch-size"
                        className="w-10 text-center"
                        size="xs"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e))}
                    />
                </div>
                <Button
                    disabled={isRunning}
                    onClick={() => {
                        setStartImport(true)
                    }}
                    size="xs"
                >
                    {isRunning ? <Loader size="sm" /> : ***REMOVED***Import selected***REMOVED***}
                </Button>
                {isRunning && (
                    <>
                        <Button onClick={() => {
                            cancel()
                            setStartImport(false)
                        }} size="xs" variant="destructive">
                            Cancel
                        </Button>
                        <span className="text-xs">
                            {progress.done} of {progress.total}
                        </span>
                    </>
                )}
                {runError && <span className="text-red-500 text-xs">Error: {String(runError)}</span>}
            </div>
            <TableVirtuoso
                className="w-full bg-slate-100"
                data={data}
                components={TableComponentsOverride}
                fixedHeaderContent={() => (
                    <tr>
                        <th className="px-6 py-3">Label</th>
                        <th className="px-6 w-[50%] py-3">Identifier</th>
                    </tr>
                )}
                itemContent={(index, doc) => (
                    <Row {...doc} index={index} onChangeSelected={onChangeSelected} />
                )}
            />
        </>
    )
}

const isAbortError = (error: unknown, signal?: AbortSignal) =>
    (error instanceof DOMException && error.name === ***REMOVED***AbortError***REMOVED***) || !!signal?.aborted



type IImportPageProps = {
    defaultImportUrl: string
    defaultDetailRoot: string
    label: string
    pluralLabel?: string
    service: ({ signal, url }: { signal: AbortSignal, url: string }) => Promise<IDocumentImport<unknown>[]>,
    getFullDoc: (props: { doc: IDocumentImport, url?: string, signal?: AbortSignal, serviceRoot?: string }) => Promise<IFullDocForImport>,
    objectType?: IObjectType
}

const ImportRecordsPage = ({
    defaultImportUrl,
    defaultDetailRoot,
    label,
    pluralLabel,
    service,
    getFullDoc,
    // objectType
}: IImportPageProps): ReactElement => {
    pluralLabel = pluralLabel || `${label}s`
    const [draftUrl, setDraftUrl] = useState<string | undefined>(
        defaultImportUrl
    )

    const [draftDetailUrl, setDraftDetailUrl] = useState<string | undefined>(
        defaultDetailRoot
    )

    useEffect(() => {
        setActiveUrl(undefined)
        setActiveDetailUrl(undefined)
        setDraftUrl(defaultImportUrl)
        setDraftDetailUrl(defaultDetailRoot)
        setLoadCount(0)
    }, [defaultImportUrl, defaultDetailRoot])

    const [activeUrl, setActiveUrl] = useState<string | undefined>(undefined)
    const [activeDetailUrl, setActiveDetailUrl] = useState<string | undefined>(undefined)
    const [loadCount, setLoadCount] = useState(0)

    const {
        data: documents,
        error,
        //isError,
        isFetching,
        //isSuccess,
        isPending,
    } = useQuery({
        queryKey: [label, activeUrl, loadCount],
        enabled: !!activeUrl,
        queryFn: async ({ signal }) => {
            try {
                const docs = await service({ signal, url: activeUrl! })
                return docs
            } catch (error) {
                if (isAbortError(error, signal)) {
                    // cancellation is expected when query is replaced/unmounted
                    // do not log as an error and do not convert to failed state
                    return []
                }
                console.error(***REMOVED***Error fetching documents:***REMOVED***, error)
                throw error
            }
        },
        placeholderData: (previousData) => previousData,
    })

    /* const state = useMemo<***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***success***REMOVED*** | ***REMOVED***error***REMOVED***>(() => {
        if (!activeUrl) return ***REMOVED***idle***REMOVED***
        if (isError) return ***REMOVED***error***REMOVED***
        if (isPending || isFetching) return ***REMOVED***loading***REMOVED***
        if (isSuccess) return ***REMOVED***success***REMOVED***
        return ***REMOVED***idle***REMOVED***
    }, [activeUrl, isError, isPending, isFetching, isSuccess]) */

    return (
        <div className="flex flex-col gap-4 h-full">
            <h1 className="text-2xl font-bold">Import {pluralLabel}</h1>

            <div className="flex flex-row gap-4 items-center">
                <Input
                    id="import-url"
                    testId="import-url"
                    className="w-90"
                    size="sm"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e)}
                />
                <Input
                    id="detail-root-url"
                    testId="detail-root-url"
                    className="w-90"
                    size="sm"
                    value={draftDetailUrl}
                    onChange={(e) => setDraftDetailUrl(e)}
                />
                <Button
                    disabled={!draftUrl || isFetching}
                    onClick={() => {
                        setActiveUrl(draftUrl)
                        setActiveDetailUrl(draftDetailUrl)
                        setLoadCount((n) => n + 1)
                    }}
                >
                    Load {pluralLabel}
                </Button>
            </div>

            <div className="relative flex-col h-full">
                {
                    !activeUrl || (isPending && !isFetching) ? ***REMOVED***Click on the button***REMOVED*** :
                        <ViewWithLoader isLoading={isFetching} error={error} data={documents}>
                            {documents && <ImportRecords documents={documents} getFullDoc={getFullDoc} detailRoot={activeDetailUrl} />}
                        </ViewWithLoader>
                }
            </div>
        </div>
    )
}

export default (props: IImportPageProps): ReactElement => {
    return <ImportRecordsPage {...props} />
}
