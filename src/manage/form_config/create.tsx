import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchListFromPostgrest } from "@/services/postgrest/services";
import { fetchObjectTypes } from "@/manage/object_type/services";

const CreateObjectSchemaForm = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>({
        'auto-slug': true
    });
    const auth = useAuth();

    const onSave = () => {
        setSaving(true);
        const { 'auto-slug': _, ...valuesToSave } = formValue;
        postObjectSchema({
            object_schema: {
                ...valuesToSave as Omit<IObjectSchema, 'uuid' | 'created_at' | 'updated_at'>,
            },
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            navigate('/object_schema')
        })
    }

    useEffect(() => {
        if (formValue['auto-slug']) {
            const label = formValue['label'] as string | undefined;
            if (label) {
                const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                setFormValue(prev => ({ ...prev, slug }));
            }
        }
    }, [formValue['label'], formValue['auto-slug']])

    const form: IForm = {
        id: 'create-object-type',
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
                id: 'auto-slug',
                label: 'Auto-generate slug from label',
                type: 'boolean'
            },
            {
                id: 'slug',
                label: 'Slug',
                type: 'text',
                required: true,
                conditions: {
                    field: 'auto-slug',
                    value: true,
                    operator: 'eq',
                    result: 'disable'
                }
            },
            {
                id: 'object_type_uuid',
                label: 'Type',
                type: 'select',
                options: object_types.map(ot => ({ label: ot.label, value: ot.uuid })),
                required: true
            },
            {
                id: 'is_type_default',
                label: 'Is default schema for selected type',
                type: 'boolean'
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
            },
            {
                id: 'schema',
                label: 'Schema (JSON)',
                type: 'json',
                required: true
            }
        ]
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to create an object type.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Create schema</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateObjectSchema = (): ReactElement => {
    const auth = useAuth();
    const { data: object_types, isLoading, error } = useQuery({
        queryKey: ['object_type_list'],
        queryFn: async ({ signal }) => {
            if (!auth.user) return Promise.resolve([]);
            const data = await fetchObjectTypes({
                token: auth.user.access_token,
                signal
            })
            return data

        }
    })
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {
                object_types && <CreateObjectSchemaForm object_types={object_types} />
            }
        </ViewWithLoader>
    )

}

export default CreateObjectSchema