import { dateTime } from "@/lib/date"
import { useObjectTypeListWithRollups } from "@/manage/object_type/useObjectTypeList"
import { Button, SelectInput, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { useState, type ReactElement } from "react"
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import type { IObjectType, IRollup } from "@/types/types"
import { deleteObjectType } from "./services"
import { useAuth } from "react-oidc-context"


const DeleteButton = ({object_type}: {object_type: IObjectType}): ReactElement => {
    const [confirm, setConfirm] = useState(false);
    const auth = useAuth()
    const handleClick = (): void => {
        if (!confirm) {
            setConfirm(true);
        } else {
            handleDelete()
        }
    }
    const handleDelete = (): void => {
        deleteObjectType({
            uuid: object_type.uuid,
            token: auth?.user?.access_token ?? ***REMOVED******REMOVED***
        })
    }
    return <Button onClick={handleClick} size=***REMOVED***xs***REMOVED*** type=***REMOVED***alert***REMOVED*** className=***REMOVED***text-white***REMOVED***>{confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}</Button>
}

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
                                        },
                                        {
                                            label: ***REMOVED***Delete***REMOVED***,
                                            id: ***REMOVED***delete***REMOVED***,
                                            accessor: r => <DeleteButton object_type={r as IObjectType} />
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