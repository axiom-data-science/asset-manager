import { useDocumentList } from "@/manage/documents/useDocumentList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"


const ListDocuments = (): ReactElement => {

    const { data: documents, isLoading, error } = useDocumentList({}, ['owner_sub', 'type'])

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
            <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(documents?.rollups ?? []).map(r => {
                        const rollup = documents?.rollups?.[r];
                        return (
                            <SelectInput
                                id={r}
                                testId={r}
                                key={r}
                                label={r}
                                size='xs'
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
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={documents?.items}
                        columns={[
                            {
                                label: 'Type',
                                id: 'type'
                            },
                            {
                                label: 'Label',
                                id: 'label'
                            },
                            {
                                label: 'Owner',
                                id: 'owner_sub'
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

export default ListDocuments