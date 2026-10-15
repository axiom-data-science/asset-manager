import ShareDocument from "@/components/custom/share-document"

import Link from "@/manage/components/link"
import Table from "@/manage/components/table"
import PublishedButton from "@/manage/document/publish_button"
import { useDocumentList } from "@/manage/document/useDocumentList"
import contextStateAtom from "@/state/contextStateAtom"
import type { IDocument, IPostgrestFilter } from "@/types/types"
import { Button, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { useAtom } from "jotai"
import { Share } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

const WaterLevelDocuments = ({ Heading, filter }: { Heading?: ReactNode, filter?: IPostgrestFilter }): ReactElement => {
    const [context] = useAtom(contextStateAtom)
    const waterLevelType = context.object_type_by_slug['water_level']
    const { data, isLoading, error } = useDocumentList({
        params: {
            filters: [
                { column: 'object_type_uuid', operator: 'eq', value: waterLevelType?.uuid },
                ...(filter ? [filter] : [])
            ],
            order: [{ column: 'created_at', dir: 'desc' }]
        }
    })
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {
                data?.items?.length ? (
                    <div className='flex flex-col gap-4'>
                        {Heading && <>{Heading}</>}
                        <Table
                            className="w-full text-xs"
                            rowClassName="odd:bg-slate-100"
                            theadClassName="sticky top-22 hidden"
                            data={data?.items}
                            columns={[
                                {
                                    label: 'Label',
                                    id: 'label',
                                    cellClassName: 'flex flex-row gap-2 items-center',
                                    accessor: (r) => (
                                        <>
                                            {r.can_modify === true && r.lock_sub === null ? (
                                                <Link to={{
                                                    pathname: `/edit-document/${r.uuid}`,
                                                    search: new URLSearchParams({
                                                        'returnToOnSuccess': `/create-document-success?uuid=${r.uuid}&action=edit`,
                                                        'skip_tabs': 'true'
                                                    }).toString(),
                                                }} className='font-bold'>{r.label}</Link>
                                            ) : (
                                                r.label
                                            )}
                                            <ShareDocument document={r as IDocument} SelectButton={<Button size='xs' variant='outline'>Share <Share /></Button>} />
                                        </>
                                    ),
                                },
                                {
                                    id: 'published',
                                    label: 'Published',
                                    cellClassName: 'hidden',
                                    accessor: (r) => (
                                        <PublishedButton document={r as IDocument & { can_modify: boolean }} />
                                    ),
                                },
                                {
                                    label: 'Owner',
                                    id: 'owner_sub',
                                },
                                {
                                    label: 'Created',
                                    id: 'created_at',
                                    accessor: (r) => <span className='text-[10px]'>{new Date(r.created_at).toLocaleString()}</span>,
                                },
                                {
                                    label: 'Updated',
                                    id: 'updated_at',
                                    accessor: (r) => <span className='text-[10px]'>{new Date(r.updated_at).toLocaleString()}</span>,
                                }
                            ]}
                        />
                    </div>
                ) : (
                    <></>
                )
            }
        </ViewWithLoader>
    )
}

export default WaterLevelDocuments