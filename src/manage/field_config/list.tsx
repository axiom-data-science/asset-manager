import { useObjectSchemaList } from "@/manage/object_schema/useObjectSchemaList"
import type { IObjectSchema } from "@/types/types"
import { Button, SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useAuth } from '@/auth/useAuth'
import Table from '@/manage/components/table'
import { useFieldConfigListWithRollups } from "@/manage/field_config/useFieldConfigList"
import Link from "@/manage/components/link"



const ListFieldConfigTable = ({ object_schemas }: { object_schemas: IObjectSchema[] }): ReactElement => {

    const { data: field_configs, isLoading, error } = useFieldConfigListWithRollups()
    const object_schemas_map = Object.fromEntries(object_schemas.map(ot => [ot.uuid, ot.label]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={field_configs}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Field Configurations</h1>
            <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(field_configs?.rollups ?? []).map(r => {
                        const rollup = field_configs?.rollups?.[r].filter(item => item.label !== null && item.label !== '');
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
                                        label: `${r === 'object_schema_uuid' ? object_schemas_map[item.label] : item.label} (${item.count})`,
                                        value: item.label
                                    })) ?? []}
                                />
                            </div>
                        )
                    })
                }
            </div>
            {
                field_configs && (
                    <Table
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={field_configs?.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label',
                                accessor: r => <Link to={`/field_configs/edit/${r.uuid}`}>{r.label}</Link>
                            },
                            {
                                label: 'Schema',
                                id: 'object_schema_uuid',
                                accessor: r => object_schemas_map[r.object_schema_uuid] ?? r.object_schema_uuid
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

const ListFieldConfigs = (): ReactElement => {

    const auth = useAuth();
    const { data: object_schemas, isLoading, error } = useObjectSchemaList()
    if (!auth.user) {
        return (
            <div className="p-20">
                <p>You must be logged in to view object schemas.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_schemas}>
            {object_schemas && <ListFieldConfigTable object_schemas={object_schemas} />}
        </ViewWithLoader>
    )
}

export default ListFieldConfigs