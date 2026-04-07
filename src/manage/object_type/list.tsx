import { dateTime } from "@/lib/date"
import { useObjectTypeListWithRollups } from "@/manage/object_type/useObjectTypeList"
import { SelectInput, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import Link from '@/manage/components/link'
import Table from '@/manage/components/table'
import type { IRollup } from "@/types/types"
import CopyField from "@/manage/components/copy_field"


const ListObjectTypes = (): ReactElement => {

    const { data: object_type, isLoading, error } = useObjectTypeListWithRollups({
        params: {
            order: [
                {
                    column: 'created_at',
                    dir: 'desc'
                }
            ]
        },
        rollups: ['category']
    })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
            {object_type && (
                <>
                    {
                        object_type?.items.length === 0
                            ? <div className="p-4"><p>No object types found.</p>
                                <div className='mt-4'><Link to='/object_type/create' className={utils.createButtonClass({
                                    size: 'md',
                                    variant: 'primary'
                                })}>Create object type</Link>
                                </div>
                            </div>
                            : <><div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                                {
                                    Object.keys(object_type?.rollups ?? []).map(r => {
                                        const rollup = object_type?.rollups?.[r].filter(item => item.label !== null && item.label !== '') as IRollup[] | undefined;
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


                                <Table
                                    className='w-full'
                                    rowClassName="odd:bg-slate-100"
                                    theadClassName="sticky top-26"
                                    data={object_type?.items}
                                    columns={[
                                        {
                                            label: 'Label',
                                            id: 'label',
                                            accessor: r => {
                                                return <><Link to={`/object_type/edit/${r.uuid}`} className="text-blue-600 hover:underline">{r.label}</Link><br /></>
                                            }
                                        },
                                        {
                                            label: 'Category',
                                            id: 'category'
                                        },
                                        {
                                            label: 'Owner',
                                            id: 'owner_sub'
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
                            </>

                    }
                </>
            )}

        </ViewWithLoader>
    )

}

export default ListObjectTypes