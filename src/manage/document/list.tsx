import { useDocumentList } from "@/manage/document/useDocumentList"
import { SelectInput, Table, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useObjectTypeList } from "../object_type/useObjectTypeList"
import type { IObjectType } from "@/types/types"


const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const { data: documents, isLoading, error } = useDocumentList({}, ['owner_sub', 'object_type_uuid'])
    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={documents}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
            <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(documents?.rollups ?? []).map(r => {
                        const rollup = documents?.rollups?.[r].filter(item => item.label !== null && item.label !== '') as { label: string, count: number }[] | undefined;
                        if (rollup?.length === 0) return null;
                        return (
                            <div className='flex flex-row gap-2' key={r}>
                                <span className='font-semibold'>{r.split('_').filter((w,i) => i < 1 || w.toLowerCase() !== 'uuid').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                                <SelectInput
                                    id={r}
                                    testId={r}
                                    key={r}
                                    label={null}
                                    size='xs'
                                    options={rollup?.map(item => ({
                                        label: `${r === 'object_type_uuid' ? object_types_map[item.label]?.label : item.label} (${item.count})`,
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
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={documents?.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label'
                            },
                            {
                                label: 'Type',
                                id: 'object_type_uuid',
                                accessor: r => object_types_map[r.object_type_uuid]?.label ?? r.object_type_uuid
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