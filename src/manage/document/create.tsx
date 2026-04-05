import { useAuth } from "@/auth/useAuth";
import { postDocument } from "@/manage/document/services";
import { type IValidationError, type IObjectSchema, type IObjectType } from "@/types/types";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import type { IDocument } from "@/types/types";
import { FormCreator, schemaToFormUtils, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Button, Loader, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useDefaultObjectSchemaAtUUID } from "@/manage/object_schema/useDefaultSchemaForType";
import { omit } from "lodash-es";
import { validate } from "@/lib/utils";
import Errors from "@/manage/components/errors";

const CreateDocumentForm = ({
    type,
    schema
}: {
    type: IObjectType,
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
    const dataForm = omit(schemaToFormUtils.schemaToFormObject(schema.json_schema), 'label')
    const form = dataForm.fields?.length || dataForm.pages?.length || dataForm.wizard_steps?.length || dataForm.tabs?.length ? dataForm : defaultForm

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
            <h1 className='text-2xl font-bold'>Create new {type?.label ?? ''} document</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const LoadSchemaAndCreateDocumentForm = ({ type }: { type: IObjectType }): ReactElement => {
    const { data: object_schema, isLoading, error } = useDefaultObjectSchemaAtUUID(type.uuid)
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_schema}>
        {
            object_schema && <CreateDocumentForm type={type} schema={object_schema} />
        }
    </ViewWithLoader>
}

const CreateDocument = (): ReactElement => {
    const [params] = useSearchParams();
    const objectType = params.get('object_type');
    const { data: object_types, isLoading, error } = useObjectTypeList()
    const typeMap = Object.fromEntries(object_types?.items?.map((ot) => [ot.uuid, ot]) ?? [])
    const selectedType = objectType ? typeMap[objectType] : null;
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
        {object_types?.items && (
            selectedType === null || selectedType === undefined
                ? <div className='flex flex-col gap-2'>
                    <h1 className='text-2xl font-bold'>Select document type</h1>

                    {object_types.items.length === 0 && <>
                        <p>No object types found. Please create an object type first.</p>
                        <div className='mt-4'><Link to='/object_type/create' className={utils.createButtonClass({
                            size: 'md',
                            variant: 'primary'
                        })}>Create object type</Link>
                        </div>
                    </>}
                    <div className='flex flex-col gap-2 max-w-70'>
                        {object_types.items.map((ot) => (
                            <Link key={ot.uuid} to={`/document/create?object_type=${ot.uuid}`} className='items-start justify-normal p-2 border rounded hover:bg-gray-100'>{ot.label}</Link>
                        ))}
                    </div>
                </div>
                : <LoadSchemaAndCreateDocumentForm type={selectedType} />
        )
        }
    </ViewWithLoader>

}



export default CreateDocument