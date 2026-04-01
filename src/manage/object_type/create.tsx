import { Button, Loader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectType } from "@/manage/object_type/types";
import { useNavigate } from "react-router-dom";

const CreateObjectType = (): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>({
        'auto-slug': true
    });
    const auth = useAuth();

    const onSave = () => {
        setSaving(true);
        postObjectType({
            object_type: {
                label: formValue['label'] as string,
                description: formValue['description'] as string | undefined,
                slug: formValue['slug'] as string
            },
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            navigate('/object_type')
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
                    value: false,
                    operator: 'eq',
                    result: 'include'
                }
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
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
            <h1 className='text-2xl font-bold'>Create object type</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

export default CreateObjectType