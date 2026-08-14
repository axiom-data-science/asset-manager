import type { IDocument, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { Input, Tabs, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import { forwardRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***@/import/types***REMOVED***
import SelectObjectTypeForImport from ***REMOVED***./select_object_type_for_import***REMOVED***
import { objectTypeForRecordsState, recordsToImportState } from ***REMOVED***@/import/state/importState***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import BatchLoadDocuments from ***REMOVED***@/import/components/batch_load_documents***REMOVED***
import { postDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { pick } from ***REMOVED***lodash-es***REMOVED***


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



const ListRow = ({ label, slug }: { index: number; uuid: string; label: string; slug: string }) => {
    return (
        <>
            <td className="px-6 py-4">
                <strong>{label}</strong>
            </td>
            <td className="px-6 py-4">{slug}</td>
        </>
    )
}

const ListRecords = ({ documents }: { documents: IDocumentImport<unknown>[] }) => {
    return (
        <>
            <TableVirtuoso
                className="w-full bg-slate-100"
                data={documents}
                components={TableComponentsOverride}
                fixedHeaderContent={() => (
                    <tr>
                        <th className="px-6 py-3">Label</th>
                        <th className="px-6 w-[50%] py-3">Identifier</th>
                    </tr>
                )}
                itemContent={(index, doc) => <ListRow {...doc} index={index} />}
            />
        </>
    )
}



const isAbortError = (error: unknown, signal?: AbortSignal) =>
    (error instanceof DOMException && error.name === ***REMOVED***AbortError***REMOVED***) || !!signal?.aborted

export type IImportPageProps = {
    defaultImportUrl: string
    defaultDetailRoot: string
    label: string
    pluralLabel?: string
    service: ({
        signal,
        url,
    }: {
        signal: AbortSignal
        url: string
    }) => Promise<IDocumentImport<unknown>[]>
    getFullDoc: (props: {
        doc: IDocumentImport
        url?: string
        signal?: AbortSignal
        serviceRoot?: string
    }) => Promise<IFullDocForImport>
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
    const [draftUrl, setDraftUrl] = useState<string | undefined>(defaultImportUrl)
    const [draftDetailUrl, setDraftDetailUrl] = useState<string | undefined>(defaultDetailRoot)
    const [activeUrl, setActiveUrl] = useState<string | undefined>(undefined)
    const [activeDetailUrl, setActiveDetailUrl] = useState<string | undefined>(undefined)
    const [loadCount, setLoadCount] = useState(0)
    const [objectTypeForRecords] = useAtom(objectTypeForRecordsState)

    const [prevDefaultImportUrl, setPrevDefaultImportUrl] = useState(defaultImportUrl)
    const [prevDefaultDetailRoot, setPrevDefaultDetailRoot] = useState(defaultDetailRoot)
    const [, setSelectedObjectType] = useAtom(objectTypeForRecordsState)
    const [, setSelectedRecordsToImport] = useAtom(recordsToImportState)

    if (prevDefaultImportUrl !== defaultImportUrl || prevDefaultDetailRoot !== defaultDetailRoot) {
        setPrevDefaultImportUrl(defaultImportUrl)
        setPrevDefaultDetailRoot(defaultDetailRoot)
        setActiveUrl(undefined)
        setActiveDetailUrl(undefined)
        setDraftUrl(defaultImportUrl)
        setDraftDetailUrl(defaultDetailRoot)
        setLoadCount(0)
    }

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
                setSelectedTab(***REMOVED***records***REMOVED***)
                setSelectedObjectType(undefined)
                setSelectedRecordsToImport([])
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

    const auth = useAuth()
    const [selectedTab, setSelectedTab] = useState(***REMOVED***records***REMOVED***)

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

            <div className="flex flex-row gap-4 items-end">
                <Input
                    id="import-url"
                    label="Import URL"
                    testId="import-url"
                    className="w-90"
                    size="sm"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e)}
                />
                <Input
                    id="detail-root-url"
                    label="Detail Root URL"
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
                {!activeUrl || (isPending && !isFetching) ? (
                    ***REMOVED******REMOVED***
                ) : (
                    <ViewWithLoader isLoading={isFetching} error={error} data={documents}>
                        {documents && (
                            <Tabs
                                className="h-full"
                                defaultContentClassName="h-full py-5 flex-col gap-2"
                                navClassName="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-sm"
                                selectedTab={selectedTab}
                                onChange={(tabId) => setSelectedTab(tabId)}
                                tabs={[
                                    {
                                        id: ***REMOVED***records***REMOVED***,
                                        label: ***REMOVED***Available Records***REMOVED***,
                                        content: <ListRecords documents={documents} />,
                                    },
                                    {
                                        id: ***REMOVED***type***REMOVED***,
                                        label: ***REMOVED***Object type***REMOVED***,
                                        content: <SelectObjectTypeForImport
                                            documents={documents}
                                            getFullDoc={getFullDoc}
                                            detailRoot={activeDetailUrl}
                                            label={label}
                                        />,
                                    },
                                    {
                                        id: ***REMOVED***validate***REMOVED***,
                                        label: ***REMOVED***Validate Records***REMOVED***,
                                        disabled: !documents?.length || !objectTypeForRecords,
                                        content: <>Validate {documents?.length} records with object type {objectTypeForRecords?.label} before import</>,
                                    },
                                    {
                                        id: ***REMOVED***import***REMOVED***,
                                        label: ***REMOVED***Import Records***REMOVED***,
                                        disabled: !documents?.length || !objectTypeForRecords,
                                        content: (
                                            <div className=***REMOVED***flex flex-col h-full gap-2***REMOVED***>
                                                <div>Importing {documents?.length} records with object type {objectTypeForRecords?.label}</div>
                                                <BatchLoadDocuments
                                                    documents={documents}
                                                    getFullDoc={getFullDoc}
                                                    detailRoot={activeDetailUrl}
                                                    onFullDocLoaded={async (doc) => {
                                                        if (objectTypeForRecords !== undefined) {
                                                            const docToSave = {
                                                                object_type_uuid: objectTypeForRecords.uuid,
                                                                ...pick(doc, [***REMOVED***label***REMOVED***, ***REMOVED***description***REMOVED***, ***REMOVED***slug***REMOVED***, ***REMOVED***data***REMOVED***]),
                                                            } as Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
                                                            const newDoc = await postDocument({
                                                                document: docToSave,
                                                                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                                                            })

                                                            console.log(***REMOVED***new document saved!***REMOVED***, newDoc)
                                                        }
                                                    }}
                                                    onAllFullDocsLoaded={async (fullDocs) => {
                                                        console.log(***REMOVED***All full docs loaded:***REMOVED***, fullDocs)
                                                    }}
                                                />
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </ViewWithLoader>
                )}
            </div>
        </div>
    )
}

export default ImportRecordsPage
