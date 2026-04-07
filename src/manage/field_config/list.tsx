import { useObjectSchemaListWithRollups } from "@/manage/object_schema/useObjectSchemaList"
import type { IObjectType } from "@/types/types"
import { Button, SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useAuth } from '@/auth/useAuth'
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList"
import Table from '@/manage/components/table'



const ListObjectSchemasTable = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const { data: object_schemas, isLoading, error } = useObjectSchemaListWithRollups({ rollups: ['object_type_uuid'] })
    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot.label]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_schemas}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object Schemas</h1>
            <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(object_schemas?.rollups ?? []).map(r => {
                        const rollup = object_schemas?.rollups?.[r].filter(item => item.label !== null && item.label !== '');
                        if (rollup?.length === 0) return null;
                        return (
                            <div className='flex flex-row gap-2' key={r}>
                                <span className='font-semibold'>{r.split('_').filter((d, i) => !(i > 0 && d === 'uuid')).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                                <SelectInput
                                    id={r}
                                    testId={r}
                                    key={r}
                                    label={null}
                                    size='xs'
                                    options={rollup?.map(item => ({
                                        label: `${r === 'object_type_uuid' ? object_types_map[item.label] : item.label} (${item.count})`,
                                        value: item.label
                                    })) ?? []}
                                />
                            </div>
                        )
                    })
                }
            </div>
            {
                object_schemas && (
                    <Table
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={object_schemas?.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label'
                            },
                            {
                                label: 'Type',
                                id: 'object_type_uuid',
                                accessor: r => object_types_map[r.object_type_uuid] ?? r.object_type_uuid
                            },
                            {
                                label: 'Owner',
                                id: 'owner_sub'
                            },
                            {
                                label: 'Created at',
                                id: 'created_at',
                                accessor: r => new Date(r.created_at).toLocaleString()
                            },
                            {
                                label: 'Updated at',
                                id: 'updated_at',
                                accessor: r => new Date(r.updated_at).toLocaleString()
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

const ListObjectSchemas = (): ReactElement => {

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
            {object_types && <ListObjectSchemasTable object_types={object_types} />}
        </ViewWithLoader>
    )
}

export default ListObjectSchemas