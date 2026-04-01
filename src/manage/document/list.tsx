import { useDocumentList } from "@/manage/document/useDocumentList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"


const ListDocuments = (): ReactElement => {

    const { data: documents, isLoading, error } = useDocumentList({}, [***REMOVED***owner_sub***REMOVED***, ***REMOVED***type***REMOVED***])

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
                                <span className=***REMOVED***font-semibold***REMOVED***>{r.split(***REMOVED***_***REMOVED***).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(***REMOVED*** ***REMOVED***)}</span>
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
                                id: ***REMOVED***label***REMOVED***
                            },
                            {
                                label: ***REMOVED***Type***REMOVED***,
                                id: ***REMOVED***type***REMOVED***
                            },
                            {
                                label: ***REMOVED***Owner***REMOVED***,
                                id: ***REMOVED***owner_sub***REMOVED***
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

export default ListDocuments