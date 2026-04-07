import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { IObjectSchema, IObjectType } from "@/types/types";
import { postObjectSchema } from "@/manage/object_schema/services";
import { validate } from "@/lib/utils";
import { useObjectCategories } from "@/manage/object_type/useObjectCategories";
import { useSlug } from "@/manage/components/useSlug";

const CreateObjectTypeForm = ({ object_categories }: { object_categories: string[] }): ReactElement => {

    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [saving, setSaving] = useState(false);
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([])
    const auth = useAuth();


    const objectTypeFormWithoutSlug: IForm = {
        id: 'create-object-type',
        settings: {
            show_progress: false
        },
        fields: [
            {
                id: 'category',
                label: 'Category',
                type: 'select',
                options: object_categories.map(c => {
                    return { label: c, value: c }
                }),
                required: true,
                settings: {

                }
            },
            {
                id: 'label',
                label: 'Label',
                type: 'text',
                required: true
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
            },
            {
                id: 'create_default_schema',
                label: 'Create default schema',
                type: 'boolean'
            }
        ]
    }

    const schemaFormWithoutSlug: IForm = {
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

    const { form, formState: [formValue, setFormValue], filterForSave } = useSlug(
        objectTypeFormWithoutSlug,
        {
            'category': object_categories.find(c => c === searchParams.get('category')) ?? object_categories.find(d => d.toLowerCase() === 'document') ?? object_categories[0],
            create_default_schema: true
        },
        ['create_default_schema']
    );

    const { form: schemaForm, formState: [schemaFormValue, setSchemaFormValue], filterForSave: schemaFilterForSave } = useSlug(
        schemaFormWithoutSlug
    )




    const onSave = async () => {
        setSaving(true);
        try {
            const typeValid = await validate({ form, formValues: formValue });
            const schemaValid = formValue['create_default_schema'] ? await validate({ form: schemaForm, formValues: schemaFormValue, messagePrefix: 'Default schema' }) : { valid: true, errors: [] }
            const valid = {
                valid: typeValid.valid && schemaValid.valid,
                errors: [...typeValid.errors, ...schemaValid.errors]
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
            const valuesToSave = filterForSave(formValue);
            const newObjectType = await postObjectType({
                object_type: valuesToSave as Omit<IObjectType, 'uuid' | 'created_at' | 'updated_at'>,
                token: auth.user?.access_token ?? ''
            })
            if (formValue['create_default_schema']) {
                const schemaValuesToSave = schemaFilterForSave(schemaFormValue);
                schemaValuesToSave['object_type_uuid'] = newObjectType.uuid;
                schemaValuesToSave['is_type_default'] = true;
                await postObjectSchema({
                    object_schema: schemaValuesToSave as Omit<IObjectSchema, 'uuid' | 'created_at' | 'updated_at'>,
                    token: auth.user?.access_token ?? ''
                });
            }
            setSaving(false);
            navigate('/object_type')
        } catch (e: unknown) {
            setSaving(false);
            setErrorMessages([{ field: 'form', message: `An error occurred while saving. Please try again. ${(e as Error)?.message ?? ''}` }])
        }
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
            <div className='flex flex-row gap-2 sticky bg-white/80 bottom-0 py-4'>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateObjectType = (): ReactElement => {
    const { data: object_categories, isLoading, error } = useObjectCategories();
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_categories}>
        {object_categories && <CreateObjectTypeForm object_categories={object_categories} />}
    </ViewWithLoader>
}

export default CreateObjectType