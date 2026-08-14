import type { IDocument, IObjectType } from '@/types/types'
import { Input, Tabs, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useQuery } from '@tanstack/react-query'

import { TableVirtuoso, type TableComponents } from 'react-virtuoso'
import { forwardRef, useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import type { IDocumentImport, IFullDocForImport } from '@/import/types'
import SelectObjectTypeForImport from './select_object_type_for_import'
import { objectTypeForRecordsState, recordsToImportState } from '@/import/state/importState'
import { useAtom } from 'jotai'
import BatchLoadDocuments from '@/import/components/batch_load_documents'
import { postDocument } from '@/manage/document/services'
import { useAuth } from '@/auth/useAuth'
import { pick } from 'lodash-es'


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
    (error instanceof DOMException && error.name === 'AbortError') || !!signal?.aborted

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
                setSelectedTab('records')
                setSelectedObjectType(undefined)
                setSelectedRecordsToImport([])
                return docs
            } catch (error) {
                if (isAbortError(error, signal)) {
                    // cancellation is expected when query is replaced/unmounted
                    // do not log as an error and do not convert to failed state
                    return []
                }
                console.error('Error fetching documents:', error)
                throw error
            }
        },
        placeholderData: (previousData) => previousData,
    })

    const auth = useAuth()
    const [selectedTab, setSelectedTab] = useState('records')

    /* const state = useMemo<'idle' | 'loading' | 'success' | 'error'>(() => {
                if (!activeUrl) return 'idle'
                if (isError) return 'error'
                if (isPending || isFetching) return 'loading'
                if (isSuccess) return 'success'
                return 'idle'
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
                    ''
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
                                        id: 'records',
                                        label: 'Available Records',
                                        content: <ListRecords documents={documents} />,
                                    },
                                    {
                                        id: 'type',
                                        label: 'Object type',
                                        content: <SelectObjectTypeForImport
                                            documents={documents}
                                            getFullDoc={getFullDoc}
                                            detailRoot={activeDetailUrl}
                                            label={label}
                                        />,
                                    },
                                    {
                                        id: 'validate',
                                        label: 'Validate Records',
                                        disabled: !documents?.length || !objectTypeForRecords,
                                        content: <>Validate {documents?.length} records with object type {objectTypeForRecords?.label} before import</>,
                                    },
                                    {
                                        id: 'import',
                                        label: 'Import Records',
                                        disabled: !documents?.length || !objectTypeForRecords,
                                        content: (
                                            <div className='flex flex-col h-full gap-2'>
                                                <div>Importing {documents?.length} records with object type {objectTypeForRecords?.label}</div>
                                                <BatchLoadDocuments
                                                    documents={documents}
                                                    getFullDoc={getFullDoc}
                                                    detailRoot={activeDetailUrl}
                                                    onFullDocLoaded={async (doc) => {
                                                        if (objectTypeForRecords !== undefined) {
                                                            const docToSave = {
                                                                object_type_uuid: objectTypeForRecords.uuid,
                                                                ...pick(doc, ['label', 'description', 'slug', 'data']),
                                                            } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>
                                                            const newDoc = await postDocument({
                                                                document: docToSave,
                                                                token: auth.user?.access_token ?? '',
                                                            })

                                                            console.log('new document saved!', newDoc)
                                                        }
                                                    }}
                                                    onAllFullDocsLoaded={async (fullDocs) => {
                                                        console.log('All full docs loaded:', fullDocs)
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
