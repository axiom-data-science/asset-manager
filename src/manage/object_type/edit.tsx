import { Button, Input, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectType } from "@/manage/object_type/types";
import { useParams } from "react-router-dom";
import { useObjectType } from "@/manage/object_type/useObjectType";

const EditObjectTypeForm = ({
    object_type
}: {
    object_type: IObjectType
}): ReactElement => {

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(object_type);
    const auth = useAuth();

    const onUpdate = () => {
        setSaving(true);
        postObjectType({
            object_type: formValue as Pick<IObjectType, 'label' | 'description' | 'slug'>,
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
        })
    }

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
                id: 'description',
                label: 'Description',
                type: 'long_text'
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
            <Input id='slug' testId='slug' type='text' label='Slug' value={object_type.slug} disabled={true} />
            <Input id='uuid' testId="uuid" type='text' label='UUID' value={object_type.uuid} disabled={true} />
            <div>
                <Button onClick={onUpdate} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Update'}</Button>
            </div>
        </div>
    )
}

const EditObjectType = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const { data: object_type, isLoading, error } = useObjectType(uuid ?? '')
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
        {object_type && <EditObjectTypeForm object_type={object_type} />}
    </ViewWithLoader>
}

export default EditObjectType