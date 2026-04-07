import { useAuth } from "@/auth/useAuth";
import { patchDocument } from "@/manage/document/services";
import { type IValidationError, type IObjectSchema } from "@/types/types";
import type { IDocument } from "@/types/types";
import { FormCreator, schemaToFormUtils, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { useDefaultObjectSchemaAtUUID } from "@/manage/object_schema/useDefaultSchemaForType";
import { omit } from "lodash-es";
import { validate } from "@/lib/utils";
import Errors from "@/manage/components/errors";
import { useDocument } from "./useDocument";

const EditDocumentForm = ({
    document,
    schema
}: {
    document: IDocument,
    schema: IObjectSchema
}): ReactElement => {
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<IFormValues>(document.data as unknown as IFormValues);
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
            await patchDocument({
                uuid: document.uuid,
                document: {
                    uuid: document.uuid,
                    label: formValues.label ?? formValues.title ?? 'Untitled Document',
                    description: formValues.description ?? '',
                    data: formValues
                } as Omit<IDocument, 'created_at' | 'updated_at'>,
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
        <div className='flex flex-col gap-4 relative'>
            <h1 className='text-2xl font-bold'>Edit document</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className='flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10'>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}




const LoadSchemaAndCreateDocumentForm = ({ document }: { document: IDocument }): ReactElement => {
    const { data: object_schema, isLoading, error } = useDefaultObjectSchemaAtUUID(document.object_type_uuid)
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_schema}>
        {
            object_schema && <EditDocumentForm document={document} schema={object_schema} />
        }
    </ViewWithLoader>
}


const EditDocument = (): ReactElement => {
    const uuid = useParams().uuid ?? null

    const { data: document, isLoading, error } = useDocument(uuid)
    if (uuid === null || uuid === undefined) {
        return (
            <div className="p-20">
                <p>No document specified. Please select a document to edit.</p>
            </div>
        )
    }
    return <ViewWithLoader isLoading={isLoading} error={error} data={document}>
        {
            document && <LoadSchemaAndCreateDocumentForm document={document as IDocument} />
        }
    </ViewWithLoader>

    //return <ObjectTypeLoader urlRoot="/document/create" View={LoadSchemaAndCreateDocumentForm} />
}



export default EditDocument