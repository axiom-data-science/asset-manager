import { useDocumentList } from "@/manage/document/useDocumentList"
import { SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useObjectTypeList } from "../object_type/useObjectTypeList"
import type { IObjectType } from "@/types/types"
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import Link from "../components/link"


const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const { data: documents, isLoading, error } = useDocumentList({}, [***REMOVED***owner_sub***REMOVED***, ***REMOVED***object_type_uuid***REMOVED***])
    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
            <div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                {
                    Object.keys(documents?.rollups ?? []).map(r => {
                        const rollup = documents?.rollups?.[r].filter(item => item.label !== null && item.label !== ***REMOVED******REMOVED***) as { label: string, count: number }[] | undefined;
                        if (rollup?.length === 0) return null;
                        return (
                            <div className=***REMOVED***flex flex-row gap-2***REMOVED*** key={r}>
                                <span className=***REMOVED***font-semibold***REMOVED***>{r.split(***REMOVED***_***REMOVED***).filter((w,i) => i < 1 || w.toLowerCase() !== ***REMOVED***uuid***REMOVED***).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(***REMOVED*** ***REMOVED***)}</span>
                                <SelectInput
                                    id={r}
                                    testId={r}
                                    key={r}
                                    label={null}
                                    size=***REMOVED***xs***REMOVED***
                                    options={rollup?.map(item => ({
                                        label: `${r === ***REMOVED***object_type_uuid***REMOVED*** ? object_types_map[item.label]?.label : item.label} (${item.count})`,
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
                        className=***REMOVED***w-full***REMOVED***
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={documents?.items}
                        columns={[
                            {
                                label: ***REMOVED***Label***REMOVED***,
                                id: ***REMOVED***label***REMOVED***,
                                accessor: r => <Link to={`/document/edit/${r.uuid}`}>{r.label}</Link>
                            },
                            {
                                label: ***REMOVED***Type***REMOVED***,
                                id: ***REMOVED***object_type_uuid***REMOVED***,
                                accessor: r => <Link to={`/object_type/edit/${r.object_type_uuid}`}>{object_types_map[r.object_type_uuid]?.label ?? r.object_type_uuid}</Link>
                            },
                            {
                                label: ***REMOVED***Owner***REMOVED***,
                                id: ***REMOVED***owner_sub***REMOVED***
                            },
                            {
                                label: ***REMOVED***Updated***REMOVED***,
                                id: ***REMOVED***updated_at***REMOVED***,
                                accessor: r => new Date(r.updated_at).toLocaleString()
                            },
                            {
                                label: ***REMOVED***Created***REMOVED***,
                                id: ***REMOVED***created_at***REMOVED***,
                                accessor: r => new Date(r.created_at).toLocaleString()
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

const ListDocumentsLoader = (): ReactElement => {
    const {data: object_types, isLoading, error} = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {
                object_types && <ListDocuments object_types={object_types.items} />
            }
        </ViewWithLoader>
    )
}

export default ListDocumentsLoader