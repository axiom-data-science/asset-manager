import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { patchForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import { type IValidationError, type IAssetForm } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { formQueryKey, useForm } from "@/manage/form/useForm";
import { useQueryClient } from "@tanstack/react-query";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { CopyFields } from "../components/copy_field";
import { formListQueryKey } from "./useFormList";

const EditForm = ({
    assetForm
}: {
    assetForm: IAssetForm
}): ReactElement => {

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState(false);
    const [formValues, setFormValue] = useState<IFormValues>(assetForm as unknown as IFormValues);
    const [errors, setErrors] = useState<IValidationError[]>([]);
    const auth = useAuth();
    const navigate = useNavigate()

    const onUpdate = async () => {
        setSaving(true);
        const valid = await validate({ formValues, form })
        if (!valid.errors) {
            setSaving(false);
            setErrors(valid.errors)
            return;
        }
        try {
            await patchForm({
                uuid: assetForm.uuid,
                form: formValues as unknown as IAssetForm,
                token: auth.user?.access_token ?? ''
            })
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: formQueryKey(assetForm.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: formListQueryKey() })
            navigate('/form')
        } catch (e) {
            setSaving(false);
            setErrors([{ field: 'form', message: `An error occurred while updating the form. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ''}` }])
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }
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
                id: 'is_schema_and_version_default',
                label: 'Is default form for object type and schema version?',
                type: 'boolean'
            },
            {
                id: 'form_config',
                label: 'Form configuration (JSON)',
                type: 'json',
                required: true
            },
            {
                id: 'slug',
                label: 'Slug',
                type: 'constant',
                defaultValue: assetForm.slug
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
            <h1 className='text-2xl font-bold'>Edit form</h1>
            <Errors errors={errors} />
            <CopyFields fields={[
                { id: 'slug', label: 'Slug', value: assetForm.slug },
                { id: 'uuid', label: 'UUID', value: assetForm.uuid },
                { id: 'object_type_uuid', label: 'Object type', value: assetForm.object_type_uuid }
            ]} />
            <FormCreator form={form} formValueState={[formValues, setFormValue]} className='-mt-8' />
            <div>
                <Button onClick={onUpdate} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Update'}</Button>
            </div>
        </div>
    )
}

const EditFormLoader = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const { data: form, isLoading, error } = useForm(uuid ?? '')
    return <ViewWithLoader isLoading={isLoading} error={error} data={form}>
        {form && <EditForm assetForm={form} />}
    </ViewWithLoader>
}

export default EditFormLoader