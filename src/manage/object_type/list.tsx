import { dateTime } from "@/lib/date"
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList"
import { Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { Link } from "react-router-dom"


const ListObjectTypes = (): ReactElement => {

    const { data: documents, isLoading, error } = useObjectTypeList({
        order: [
            {
                column: 'created_at',
                dir: 'desc'
            }
        ]
    })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
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