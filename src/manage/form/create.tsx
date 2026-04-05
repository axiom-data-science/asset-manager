import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IObjectType } from '@/types/types'
import { useNavigate } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useSlug } from "@/manage/components/useSlug";

const CreateForm = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ field: string, message: string }[]>([]);
    const auth = useAuth();
    const onSave = async () => {
        const valuesToSave = filterForSave(formValues);
        const valid = await validate({ form, formValues: valuesToSave });
        if (!valid.valid && valid.errors.length > 0) {
            setErrors(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return;
        }
        setSaving(true);
        
        postForm({
            form: {
                ...valuesToSave as Omit<IAssetForm, 'uuid' | 'created_at' | 'updated_at'>
            },
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            navigate('/form')
        })
    }



    const formWithoutSlug: IForm = {
        id: 'create-form',
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
                id: 'object_type_uuid',
                label: 'Type',
                type: 'select',
                options: object_types.map(ot => ({ label: ot.label, value: ot.uuid })),
                required: true
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
            },
            {
                id: 'is_type_default',
                label: 'Is default form for selected type',
                type: 'boolean'
            },
            {
                id:'form_config',
                label: 'Form configuration (JSON)',
                type: 'json',
                required: true
            },
            {
                id:'field_override_configs',
                label: 'Field override configurations (JSON)',
                description: "Provide an array of field override configs. Each config should include the id (as `prop`) of the field to override and the config to override with. Example:\n\n `[{\"prop\": \"field_to_override\", \"type\":\"radio\", \"options\": [{\"label\": \"Option 1\", \"value\": \"option_1\"}, {\"label\": \"Option 2\", \"value\": \"option_2\"}]}]`",
                type: 'json',
                multiple: true
            }
        ]
    }

    const { form, formState: [formValues, setFormValue], filterForSave } = useSlug(
        formWithoutSlug,
        undefined,
        ['field_override_configs']
    );

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
            <h1 className='text-2xl font-bold'>Create form</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValue]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateFormLoader = (): ReactElement => {
    const { data: object_type, isLoading, error } = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
            {
                object_type?.items && <CreateForm object_types={object_type.items} />
            }
        </ViewWithLoader>
    )
}

export default CreateFormLoader