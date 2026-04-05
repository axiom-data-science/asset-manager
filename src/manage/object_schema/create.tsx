import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import { useSlug } from "../components/useSlug";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";

const CreateObjectSchemaForm = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);

    const onSave = async () => {
        const valuesToSave = filterForSave(formValue);
        const valid = await validate({ form, formValues: valuesToSave });
        if (!valid.valid && valid.errors.length > 0) {
            setErrorMessages(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return;
        }
        setSaving(true);
        postObjectSchema({
            object_schema: {
                ...valuesToSave as Omit<IObjectSchema, 'uuid' | 'created_at' | 'updated_at'>
            },
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            navigate('/object_schema')
        })
    }



    const formWithoutSlug: IForm = {
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
                id: 'json_schema',
                label: 'Schema (JSON)',
                type: 'json',
                required: true
            }
        ]
    }

    const {form, formState: [formValue, setFormValue], filterForSave} = useSlug(formWithoutSlug)

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
            <Errors errors={errorMessages} />
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateObjectSchema = (): ReactElement => {
    const { data: object_type, isLoading, error } = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
            {
                object_type?.items && <CreateObjectSchemaForm object_types={object_type.items} />
            }
        </ViewWithLoader>
    )

}

export default CreateObjectSchema