import { Button, Loader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import { useNavigate } from "react-router-dom";
import type { IObjectSchema, IObjectType } from "@/types/types";
import { postObjectSchema } from "@/manage/object_schema/services";
import { validate } from "@/lib/utils";

const CreateObjectType = (): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([])
    const [formValue, setFormValue] = useState<IFormValues>({
        'auto-slug': true
    });
    const auth = useAuth();


    const onSave = async () => {
        setSaving(true);
        const typeValie = await validate({ form, formValues: formValue });
        const schemaValid = formValue['create_default_schema'] ? await validate({ form: schemaForm, formValues: schemaFormValue, messagePrefix: 'Default schema' }) : { valid: true, errors: [] }
        const valid = {
            valid: typeValie.valid && schemaValid.valid,
            errors: [...typeValie.errors, ...schemaValid.errors]
        }
        if (!valid.valid) {
            setSaving(false)
            setErrorMessages(valid.errors)
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return
        }
        setErrorMessages([])
        const { 'auto-slug': _, 'create_default_schema': __, ...valuesToSave } = formValue;
        const newObjectType = await postObjectType({
            object_type: valuesToSave as Omit<IObjectType, 'uuid' | 'created_at' | 'updated_at'>,
            token: auth.user?.access_token ?? ''
        })
        if (formValue['create_default_schema']) {
            const { 'auto-slug': _, ...schemaValuesToSave } = schemaFormValue
            schemaValuesToSave['object_type_uuid'] = newObjectType.uuid;
            schemaValuesToSave['is_type_default'] = true;
            await postObjectSchema({
                object_schema: schemaValuesToSave as Omit<IObjectSchema, 'uuid' | 'created_at' | 'updated_at'>,
                token: auth.user?.access_token ?? ''
            });
        }
        setSaving(false);
        navigate('/object_type')
    }

    const updateSlug = (value: IFormValues, setter: React.Dispatch<React.SetStateAction<IFormValues>>) => {
        const autoSlug = Boolean(value['auto-slug']);
        const label = value['label'] as string | undefined;
        if (autoSlug && label !== undefined) {
            const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            setter(prev => ({ ...prev, slug }));
        }
    }

    useEffect(() => {
        updateSlug(formValue, setFormValue);
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
                id: 'description',
                label: 'Description',
                type: 'long_text',
            },
            {
                id: 'create_default_schema',
                label: 'Create default schema',
                type: 'boolean',
                defaultValue: false
            }
        ]
    }

    const schemaForm: IForm = {
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
    const [schemaFormValue, setSchemaFormValue] = useState<IFormValues>({
        'auto-slug': true
    });

    useEffect(() => {
        updateSlug(schemaFormValue, setSchemaFormValue);
    }, [schemaFormValue['label'], schemaFormValue['auto-slug']])

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
            {
                errorMessages.length > 0 && <div className='p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
                    <ul className='list-disc list-inside'>
                        {errorMessages.map((err, i) => <li key={i}>{err.message}</li>)}
                    </ul>
                </div>
            }
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            {
                formValue['create_default_schema'] && <div className='flex flex-col gap-4 p-4 bg-slate-100 border-2 shadow-md rounded'>
                    <h5 className='text-slate-800 font-bold'>Default schema details</h5>
                    <div className='flex flex-wrap scale-96 -mt-[4%]'>
                        <FormCreator form={schemaForm} formValueState={[schemaFormValue, setSchemaFormValue]} />
                    </div>
                </div>
            }
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

export default CreateObjectType