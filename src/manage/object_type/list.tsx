import { dateTime } from "@/lib/date"
import { useObjectTypeListWithRollups } from "@/manage/object_type/useObjectTypeList"
import { SelectInput, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import type { IRollup } from "@/types/types"
import CopyField from "@/manage/components/copy_field"


const ListObjectTypes = (): ReactElement => {

    const { data: object_type, isLoading, error } = useObjectTypeListWithRollups({
        params: {
            order: [
                {
                    column: ***REMOVED***created_at***REMOVED***,
                    dir: ***REMOVED***desc***REMOVED***
                }
            ]
        },
        rollups: [***REMOVED***category***REMOVED***]
    })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
            {object_type && (
                <>
                    {
                        object_type?.items.length === 0
                            ? <div className="p-4"><p>No object types found.</p>
                                <div className=***REMOVED***mt-4***REMOVED***><Link to=***REMOVED***/object_type/create***REMOVED*** className={utils.createButtonClass({
                                    size: ***REMOVED***md***REMOVED***,
                                    variant: ***REMOVED***primary***REMOVED***
                                })}>Create object type</Link>
                                </div>
                            </div>
                            : <><div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                                {
                                    Object.keys(object_type?.rollups ?? []).map(r => {
                                        const rollup = object_type?.rollups?.[r].filter(item => item.label !== null && item.label !== ***REMOVED******REMOVED***) as IRollup[] | undefined;
                                        if (rollup?.length === 0) return null;
                                        return (
                                            <div className=***REMOVED***flex flex-row gap-2***REMOVED*** key={r}>
                                                <span className=***REMOVED***font-semibold***REMOVED***>{r.split(***REMOVED***_***REMOVED***).filter((d, i) => !(i > 0 && d === ***REMOVED***uuid***REMOVED***)).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(***REMOVED*** ***REMOVED***)}</span>
                                                <SelectInput
                                                    id={r}
                                                    testId={r}
                                                    key={r}
                                                    label={null}
                                                    size=***REMOVED***xs***REMOVED***
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
                                    className=***REMOVED***w-full***REMOVED***
                                    rowClassName="odd:bg-slate-100"
                                    theadClassName="sticky top-26"
                                    data={object_type?.items}
                                    columns={[
                                        {
                                            label: ***REMOVED***Label***REMOVED***,
                                            id: ***REMOVED***label***REMOVED***,
                                            accessor: r => {
                                                return <><Link to={`/object_type/edit/${r.uuid}`} className="text-blue-600 hover:underline">{r.label}</Link><br /></>
                                            }
                                        },
                                        {
                                            label: ***REMOVED***Category***REMOVED***,
                                            id: ***REMOVED***category***REMOVED***
                                        },
                                        {
                                            label: ***REMOVED***Owner***REMOVED***,
                                            id: ***REMOVED***owner_sub***REMOVED***
                                        },
                                        {
                                            label: ***REMOVED***Created at***REMOVED***,
                                            id: ***REMOVED***created_at***REMOVED***,
                                            accessor: r => dateTime(r.created_at)
                                        },
                                        {
                                            label: ***REMOVED***Updated at***REMOVED***,
                                            id: ***REMOVED***updated_at***REMOVED***,
                                            accessor: r => r.updated_at ? dateTime(r.updated_at) : ***REMOVED***NA***REMOVED***
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