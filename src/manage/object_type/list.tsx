import { dateTime } from "@/lib/date"
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList"
import { Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { Link } from "react-router-dom"


const ListObjectTypes = (): ReactElement => {

    const { data: documents, isLoading, error } = useObjectTypeList({
        order: [
            {
                column: ***REMOVED***created_at***REMOVED***,
                dir: ***REMOVED***desc***REMOVED***
            }
        ]
    }
    )

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
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
                                accessor: r => {
                                    return <Link to={`/object_type/edit/${r.uuid}`} className="text-blue-600 hover:underline">{r.label}</Link>
                                }
                            },
                            {
                                label: ***REMOVED***Category***REMOVED***,
                                id: ***REMOVED***category***REMOVED***
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
                )
            }

        </ViewWithLoader>
    )

}

export default ListObjectTypes