import { dateTime } from "@/lib/date"
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import Link from ***REMOVED***@/manage/components/link***REMOVED***

const ListObjectTypes = (): ReactElement => {

    const { data: documents, isLoading, error } = useObjectTypeList({
        order: [
            {
                column: ***REMOVED***created_at***REMOVED***,
                dir: ***REMOVED***desc***REMOVED***
            }
        ]
    },
    [***REMOVED***category***REMOVED***]
    )

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
                        <div className=***REMOVED***flex flex-row gap-4 p-2 sticky top-10 bg-white z-10***REMOVED***>
                {
                    Object.keys(documents?.rollups ?? []).map(r => {
                        const rollup = documents?.rollups?.[r].filter(item => item.label !== null && item.label !== ***REMOVED******REMOVED***) as { label: string, count: number }[] | undefined;
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