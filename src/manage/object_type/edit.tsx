import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { patchObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IObjectType } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { getObjectTypeQuery, objectTypeQueryKey } from "@/manage/object_type/useObjectType";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { CopyFields } from "../components/copy_field";
import { getFormListForObjectTypeQueryOptions } from "../form/useFormList";
import Link from '@/manage/components/link'

const EditObjectTypeForm = ({
    object_type,
    forms
}: {
    object_type: IObjectType,
    forms: IAssetForm[]
}): ReactElement => {

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(object_type as unknown as IFormValues);
    const auth = useAuth();
    const navigate = useNavigate()

    const onUpdate = () => {
        setSaving(true);
        patchObjectType({
            uuid: object_type.uuid,
            object_type: formValue as unknown as IObjectType,
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: objectTypeQueryKey(object_type.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: ['object_type_list'] })
            navigate('/object_type')
        })
    }

    const form: IForm = {
        id: 'edit-object-type',
        settings: {
            show_progress: false
        },
        fields: [
            {
                id: 'label',
                label: 'Label',
                type: 'text',
                required: true
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text'
            },
            {
                id: 'slug',
                label: 'Slug',
                type: 'constant',
                defaultValue: object_type.slug
            }
        ]
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to edit an object type.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Edit object type</h1>
            <CopyFields fields={[
                { id: 'slug', label: 'Slug', value: object_type.slug },
                { id: 'uuid', label: 'UUID', value: object_type.uuid }
            ]} />
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <h4 className='font-bold text-slate-600'>Associated Forms</h4>
            <div className='p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md'>
                {
                    forms.map(form => {
                        return (<div key={form.uuid} className='p-4 bg-white rounded-md flex flex-col gap-2'>
                            <div className='flex flex-col gap-2'>
                                
                                    <Link to={`/forms/edit/${form.uuid}`}><h2 className='font-semibold'>{form.label}</h2></Link>
                                    <CopyFields fields={[
                                        { id: `slug-${form.uuid}`, label: 'Slug', value: form.slug },
                                        { id: `uuid-${form.uuid}`, label: 'UUID', value: form.uuid }
                                    ]} />
                               
                            </div>
                            <p className='text-sm text-gray-600'>{form.description}</p>
                        </div>
                        )
                    })
                }
            </div>
            <div>
                <Button onClick={onUpdate} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Update'}</Button>
            </div>
        </div>
    )
}


const EditObjectType = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const auth = useAuth();

    const queryObject = {
        object_type: getObjectTypeQuery(uuid ?? '', auth.user?.access_token ?? ''),
        forms: getFormListForObjectTypeQueryOptions({object_type_uuid: uuid ?? '', token: auth.user?.access_token ?? ''})
    }

    
    const {isLoading, error, data} = useQueries({
        queries: Object.values(queryObject),
        combine: (results) => {
            const isLoading = results.some(r => r.isLoading);
            return {
                isLoading,
                isPending: results.some(r => r.isPending),
                error: results.find(r => r.error)?.error ?? null,
                data: !isLoading ? Object.fromEntries(results.map((r, index) => r.data ? [Object.keys(queryObject)[index], r.data] : [])) : null
            }
        }
    })


    console.log(data)

    //const { data: object_type, isLoading, error } = useObjectType(uuid ?? '')
    return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && <EditObjectTypeForm object_type={data.object_type} forms={data.forms} />}
    </ViewWithLoader>
}

export default EditObjectType