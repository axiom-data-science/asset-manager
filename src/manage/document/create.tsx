import { useAuth } from "@/auth/useAuth";
import { postDocument } from "@/manage/document/services";
import { type IValidationError, type IObjectSchema, type IObjectType } from "@/types/types";
import type { IAssetForm, IDocument, IFormToFieldConfigWithDetails } from "@/types/types";
import { FormCreator, schemaToFormUtils, type IForm, type IFormFieldOverride, type IFormOverride, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom"
import { omit } from "lodash-es";
import { validate } from "@/lib/utils";
import Errors from "@/manage/components/errors";
import ObjectTypeLoader from "../components/object_type_loader";
import Link from "@/manage/components/link";
import { useFullDefaultFormAtObjectType } from "@/manage/form/useForm";

const CreateDocumentForm = ({
    type,
    assetForm,
    fieldConfigs,
    schema
}: {
    type: IObjectType,
    assetForm: IAssetForm,
    fieldConfigs: IFormToFieldConfigWithDetails[],
    schema: IObjectSchema
}): ReactElement => {
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<IFormValues>({});
    const [errors, setErrors] = useState<IValidationError[]>([])
    const auth = useAuth()
    const defaultForm: IForm = {
        id: 'create-document',
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
                required: true
            },
            {
                id: 'data',
                label: 'Data',
                type: 'json'
            }

        ]
    }
    const fieldConfigJSON = fieldConfigs?.map(fc => fc.fields_override_config.config as unknown as IFormFieldOverride) ?? []
    const dataForm = omit(schemaToFormUtils.overridesAndSchemaToFormObject({
        schema: schema.json_schema,
        formOverrides: [assetForm?.form_config as IFormOverride],
        formFieldOverrides: [fieldConfigJSON]
    }), 'label')
    const form = dataForm.fields?.length || dataForm.pages?.length || dataForm.wizard_steps?.length || dataForm.tabs?.length ? dataForm : defaultForm
    form.settings = {
        ...form.settings,
        url_navigable: false
    }

    const onSave = async () => {
        setSaving(true);
        const valid = await validate({ form, formValues })
        if (!valid.valid && valid.errors.length > 0) {
            setErrors(valid.errors);
            setSaving(false);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return;
        }
        setErrors([])
        try {
            await postDocument({
                document: {
                    object_type_uuid: type.uuid,
                    label: formValues.label ?? formValues.title ?? 'Untitled Document',
                    data: formValues
                } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>,
                token: auth.user?.access_token ?? ''
            })

            setSaving(false);
            navigate('/document')

        } catch (e: unknown) {
            setSaving(false);
            setErrors([{ field: 'form', message: (e as Error)?.message ?? 'An error occurred while saving. Please try again.' }])
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
        }

    }

    return (
        <div className='flex flex-col gap-4'>
            <h4 className='text-sm text-gray-500'>Object type: <Link to={`/object_type/edit/${type.uuid}`} className='font-semibold'>{type.label}</Link>, schema: <Link to={`/form/edit/${schema.uuid}`} className='font-semibold'>{schema.label}</Link>, Asset form: <Link to={`/forms/edit/${assetForm.uuid}`} className='font-semibold'>{assetForm.label}</Link></h4>
            <h1 className='text-2xl font-bold'>Create new document</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className='flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end'>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const LoadSchemaAndCreateDocumentForm = ({ type }: { type: IObjectType }): ReactElement => {
    const { data, isLoading, error } = useFullDefaultFormAtObjectType({ object_type_uuid: type.uuid })

    return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {
            data && <CreateDocumentForm
                type={type}
                schema={data.object_schema}
                assetForm={data.form ?? {} as IAssetForm}
                fieldConfigs={data.field_configs}
            />
        }
    </ViewWithLoader>
}


const CreateDocument = (): ReactElement => {
    
    return <ObjectTypeLoader urlRoot="/document/create" View={LoadSchemaAndCreateDocumentForm} />
}



export default CreateDocument