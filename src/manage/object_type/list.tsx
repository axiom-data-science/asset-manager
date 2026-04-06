import { dateTime } from "@/lib/date"
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import Link from '@/manage/components/link'

const ListObjectTypes = (): ReactElement => {

    const { data: documents, isLoading, error } = useObjectTypeList({
        order: [
            {
                column: 'created_at',
                dir: 'desc'
            }
        ]
    },
    ['category']
    )

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
                        <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(documents?.rollups ?? []).map(r => {
                        const rollup = documents?.rollups?.[r].filter(item => item.label !== null && item.label !== '') as { label: string, count: number }[] | undefined;
                        if (rollup?.length === 0) return null;
                        return (
                            <div className='flex flex-row gap-2' key={r}>
                                <span className='font-semibold'>{r.split('_').filter((d, i) => !(i > 0 && d === 'uuid')).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                                <SelectInput
                                    id={r}
                                    testId={r}
                                    key={r}
                                    label={null}
                                    size='xs'
                                    options={rollup?.map(item => ({
                                        label: `${item.label} (${item.count})`,
                                        value: item.label
                                    })) ?? []}
                                />
                            </div>
                        )
                    })
                }
            </div>
            {
                documents && (
                    <Table
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={documents?.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label',
                                accessor: r => {
                                    return <Link to={`/object_type/edit/${r.uuid}`} className="text-blue-600 hover:underline">{r.label}</Link>
                                }
                            },
                            {
                                label: 'Category',
                                id: 'category'
                            },
                            {
                                label: 'Created at',
                                id: 'created_at',
                                accessor: r => dateTime(r.created_at)
                            },
                            {
                                label: 'Updated at',
                                id: 'updated_at',
                                accessor: r => r.updated_at ? dateTime(r.updated_at) : 'NA'
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

export default ListObjectTypes