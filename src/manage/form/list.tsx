import type { IAssetForm, IObjectType, IRollup } from "@/types/types"
import { Button, SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { CheckIcon, XIcon } from "lucide-react"
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import { useFormListWithRollupsAndLookups } from "@/manage/form/useFormList"



const ListFormTable = ({ object_types, forms }: { object_types: IObjectType[], forms: { items: IAssetForm[], rollups: Record<string, IRollup[]> } }): ReactElement => {


    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot.label]))

    return (
        <>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Forms</h1>
            <div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                {
                    Object.keys(forms?.rollups ?? []).map(r => {
                        const rollup = forms?.rollups?.[r].filter(item => item.label !== null && item.label !== ***REMOVED******REMOVED***) as IRollup[] | undefined;
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
                                        label: `${r === ***REMOVED***object_type_uuid***REMOVED*** ? object_types_map[item.label] : item.label} (${item.count})`,
                                        value: item.label
                                    })) ?? []}
                                />
                            </div>
                        )
                    })
                }
            </div>
            {
                forms && (
                    <Table
                        className=***REMOVED***w-full***REMOVED***
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        tbodyClassName="text-sm"
                        data={forms?.items}
                        columns={[
                            {
                                label: ***REMOVED***Label***REMOVED***,
                                id: ***REMOVED***label***REMOVED***,
                                accessor: r => <Link to={`/forms/edit/${r.uuid}`}>{r.label}</Link>
                            },
                            {
                                label: ***REMOVED***Type***REMOVED***,
                                id: ***REMOVED***object_type_uuid***REMOVED***,
                                accessor: r => <Link to={`/object_type/edit/${r.object_type_uuid}`}>{object_types_map[r.object_type_uuid] ?? r.object_type_uuid}</Link>
                            },
                            {
                                label: ***REMOVED***Version***REMOVED***,
                                id: ***REMOVED***object_schema_version***REMOVED***
                            },
                            {
                                label: ***REMOVED***Is default***REMOVED***,
                                id: ***REMOVED***is_schema_and_version_default***REMOVED***,
                                accessor: r => r.is_schema_and_version_default ? <CheckIcon className="text-green-500" /> : <XIcon className="text-gray-300" />
                            },
                            {
                                label: ***REMOVED***Owner***REMOVED***,
                                id: ***REMOVED***owner_sub***REMOVED***
                            },
                            {
                                label: ***REMOVED***Config Type***REMOVED***,
                                id: ***REMOVED***_type***REMOVED***,
                                accessor: r => r.use_form_config ? ***REMOVED***Form***REMOVED*** : ***REMOVED***Schema override***REMOVED***
                            },
                            {
                                label: ***REMOVED***Created at***REMOVED***,
                                id: ***REMOVED***created_at***REMOVED***,
                                accessor: r => new Date(r.created_at).toLocaleString()
                            },
                            {
                                label: ***REMOVED***Updated at***REMOVED***,
                                id: ***REMOVED***updated_at***REMOVED***,
                                accessor: r => new Date(r.updated_at).toLocaleString()
                            }

                        ]}
                    />
                )
            }
        </>
    )

}

const ListForm = (): ReactElement => {

    const auth = useAuth();
    const { data, isLoading, error } = useFormListWithRollupsAndLookups({ rollups: [***REMOVED***object_type_uuid***REMOVED***] })
    if (!auth.user) {
        return (
            <div className="p-20">
                <p>You must be logged in to view object schemas.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data && <ListFormTable object_types={data.object_types} forms={data.forms} />}
        </ViewWithLoader>
    )
}


export default ListForm