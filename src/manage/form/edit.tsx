import { Button, Input, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { patchForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { formQueryKey, useForm } from "@/manage/form/useForm";
import { useQueryClient } from "@tanstack/react-query";

const EditForm = ({
    assetForm
}: {
    assetForm: IAssetForm
}): ReactElement => {

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(assetForm as unknown as IFormValues);
    const auth = useAuth();
    const navigate = useNavigate()

    const onUpdate = () => {
        setSaving(true);
        patchForm({
            uuid: assetForm.uuid,
            form: formValue as unknown as IAssetForm,
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: formQueryKey(assetForm.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: ['form_list'] })
            navigate('/form')
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
            <h1 className='text-2xl font-bold'>Edit object type</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <Input id='slug' testId='slug' type='text' label='Slug' value={assetForm.slug} disabled={true} />
            <Input id='uuid' testId="uuid" type='text' label='UUID' value={assetForm.uuid} disabled={true} />
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