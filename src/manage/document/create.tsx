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
        id: ***REMOVED***create-document***REMOVED***,
        settings: {
            show_progress: false
        },
        fields: [
            {
                id: ***REMOVED***label***REMOVED***,
                label: ***REMOVED***Label***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true
            },
            {
                id: ***REMOVED***description***REMOVED***,
                label: ***REMOVED***Description***REMOVED***,
                type: ***REMOVED***long_text***REMOVED***,
                required: true
            },
            {
                id: ***REMOVED***data***REMOVED***,
                label: ***REMOVED***Data***REMOVED***,
                type: ***REMOVED***json***REMOVED***
            }

        ]
    }
    const fieldConfigJSON = fieldConfigs?.map(fc => fc.fields_override_config.config as unknown as IFormFieldOverride) ?? []
    const dataForm = omit(schemaToFormUtils.overridesAndSchemaToFormObject({
        schema: schema.json_schema,
        formOverrides: [assetForm?.form_config as IFormOverride],
        formFieldOverrides: [fieldConfigJSON]
    }), ***REMOVED***label***REMOVED***)
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
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
            return;
        }
        setErrors([])
        try {
            await postDocument({
                document: {
                    object_type_uuid: type.uuid,
                    label: formValues.label ?? formValues.title ?? ***REMOVED***Untitled Document***REMOVED***,
                    data: formValues
                } as Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            setSaving(false);
            navigate(***REMOVED***/document***REMOVED***)

        } catch (e: unknown) {
            setSaving(false);
            setErrors([{ field: ***REMOVED***form***REMOVED***, message: (e as Error)?.message ?? ***REMOVED***An error occurred while saving. Please try again.***REMOVED*** }])
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
        }

    }

    return (
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h4 className=***REMOVED***text-sm text-gray-500***REMOVED***>Object type: <Link to={`/object_type/edit/${type.uuid}`} className=***REMOVED***font-semibold***REMOVED***>{type.label}</Link>, schema: <Link to={`/form/edit/${schema.uuid}`} className=***REMOVED***font-semibold***REMOVED***>{schema.label}</Link>, Asset form: <Link to={`/forms/edit/${assetForm.uuid}`} className=***REMOVED***font-semibold***REMOVED***>{assetForm.label}</Link></h4>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create new document</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className=***REMOVED***flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end***REMOVED***>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
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