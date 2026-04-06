import type { IObjectType } from "@/types/types"
import { Button, SelectInput, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import type { ReactElement } from "react"
import { useAuth } from '@/auth/useAuth'
import { CheckIcon, XIcon } from "lucide-react"
import { useFormList } from "./useFormList"
import Link from '@/manage/components/link'
import { useObjectTypeList } from "../object_type/useObjectTypeList"
import Table from '@/manage/components/table'



const ListFormTable = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const { data: forms, isLoading, error } = useFormList({}, ['object_type_uuid'])
    const object_types_map = Object.fromEntries(object_types.map(ot => [ot.uuid, ot.label]))

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={forms}>

            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Forms</h1>
            <div className='flex flex-row gap-4 p-2 sticky top-10 bg-white z-10'>
                {
                    Object.keys(forms?.rollups ?? []).map(r => {
                        const rollup = forms?.rollups?.[r].filter(item => item.label !== null && item.label !== '') as { label: string, count: number }[] | undefined;
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
                forms && (
                    <Table
                        className='w-full'
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        data={forms?.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label',
                                accessor: r => <Link to={`/forms/edit/${r.uuid}`}>{r.label}</Link>
                            },
                            {
                                label: 'Type',
                                id: 'object_type_uuid',
                                accessor: r => object_types_map[r.object_type_uuid] ?? r.object_type_uuid
                            },
                            {
                                label: 'Version',
                                id: 'object_schema_version'
                            },
                            {
                                label: 'Is default',
                                id: 'is_type_default',
                                accessor: r => r.is_type_default ? <CheckIcon className="text-green-500" /> : <XIcon className="text-gray-300" />
                            }

                        ]}
                    />
                )
            }

        </ViewWithLoader>
    )

}

const ListForm = (): ReactElement => {

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
            {object_types && <ListFormTable object_types={object_types.items ?? []} />}
        </ViewWithLoader>
    )
}


export default ListForm