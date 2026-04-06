import type { IObjectType } from "@/types/types"
import { Button, SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { CheckIcon, XIcon } from "lucide-react"
import {  useFormListWithRollups } from "./useFormList"
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { useObjectTypeList } from "../object_type/useObjectTypeList"
import Table from ***REMOVED***@/manage/components/table***REMOVED***



const ListFormTable = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const { data: forms, isLoading, error } = useFormListWithRollups({}, [***REMOVED***object_type_uuid***REMOVED***])
    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot.label]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={forms}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Forms</h1>
            <div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                {
                    Object.keys(forms?.rollups ?? []).map(r => {
                        const rollup = forms?.rollups?.[r].filter(item => item.label !== null && item.label !== ***REMOVED******REMOVED***) as { label: string, count: number }[] | undefined;
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
                                accessor: r => object_types_map[r.object_type_uuid] ?? r.object_type_uuid
                            },
                            {
                                label: ***REMOVED***Version***REMOVED***,
                                id: ***REMOVED***object_schema_version***REMOVED***
                            },
                            {
                                label: ***REMOVED***Is default***REMOVED***,
                                id: ***REMOVED***is_type_default***REMOVED***,
                                accessor: r => r.is_type_default ? <CheckIcon className="text-green-500" /> : <XIcon className="text-gray-300" />
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

const ListForm = (): ReactElement => {

    const auth = useAuth();
    const { data: object_types, isLoading, error } = useObjectTypeList()
    if (!auth.user) {
        return (
            <div className="p-20">
                <p>You must be logged in to view object schemas.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {object_types && <ListFormTable object_types={object_types?.items} />}
        </ViewWithLoader>
    )
}


export default ListForm