import { useDocumentList } from "@/manage/documents/useDocumentList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"


const ListDocuments = (): ReactElement => {

    const { data: documents, isLoading, error } = useDocumentList({}, [***REMOVED***owner_sub***REMOVED***, ***REMOVED***type***REMOVED***])

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
            <div className=***REMOVED***p-10***REMOVED***>
                <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
                <div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                    {
                        Object.keys(documents?.rollups ?? []).map(r => {
                            const rollup = documents?.rollups?.[r];
                            return (
                                <SelectInput
                                    id={r}
                                    testId={r}
                                    key={r}
                                    label={r}
                                    size=***REMOVED***xs***REMOVED***
                                    options={rollup?.map(item => ({
                                        label: `${item.label} (${item.count})`,
                                        value: item.label
                                    })) ?? []}
                                />
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
                                    label: ***REMOVED***Type***REMOVED***,
                                    id: ***REMOVED***type***REMOVED***
                                },
                                {
                                    label: ***REMOVED***Label***REMOVED***,
                                    id: ***REMOVED***label***REMOVED***
                                },
                                {
                                    label: ***REMOVED***Owner***REMOVED***,
                                    id: ***REMOVED***owner_sub***REMOVED***
                                }

                            ]}
                        />
                    )
                }
            </div>
        </ViewWithLoader>
    )

}

export default ListDocuments