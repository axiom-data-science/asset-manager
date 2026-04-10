import { Button, Loader, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import { type IValidationError, type IAssetForm, type IFormToFieldConfigWithDetails, type IObjectSchema } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { formQueryKey, useFullForm } from "@/manage/form/useForm";
import { useQueryClient } from "@tanstack/react-query";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { CopyFields } from "../components/copy_field";
import { formListQueryKey } from "./useFormList";
import { Cog, Network, Plus } from "lucide-react";
import Link from "@/manage/components/link";

const EditForm = ({
    assetForm,
    fieldConfigs,
    objectSchema
}: {
    assetForm: IAssetForm,
    fieldConfigs: IFormToFieldConfigWithDetails[],
    objectSchema: IObjectSchema
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
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: formQueryKey(assetForm.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: formListQueryKey() })
            navigate(***REMOVED***/forms***REMOVED***)
        } catch (e) {
            setSaving(false);
            setErrors([{ field: ***REMOVED***form***REMOVED***, message: `An error occurred while updating the form. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ***REMOVED******REMOVED***}` }])
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED***
            })
        }
    }

    const form: IForm = {
        id: ***REMOVED***edit-object-type***REMOVED***,
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
                type: ***REMOVED***long_text***REMOVED***
            },
            {
                id: ***REMOVED***is_schema_and_version_default***REMOVED***,
                label: ***REMOVED***Is default form for object type and schema version?***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            },
            {
                id: ***REMOVED***form_config***REMOVED***,
                label: ***REMOVED***Form configuration (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
                required: true
            },
            {
                id: ***REMOVED***slug***REMOVED***,
                label: ***REMOVED***Slug***REMOVED***,
                type: ***REMOVED***constant***REMOVED***,
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
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Edit form</h1>
            <Errors errors={errors} />
            <CopyFields fields={[
                { id: ***REMOVED***slug***REMOVED***, label: ***REMOVED***Slug***REMOVED***, value: assetForm.slug },
                { id: ***REMOVED***uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: assetForm.uuid },
                { id: ***REMOVED***object_type_uuid***REMOVED***, label: ***REMOVED***Object type***REMOVED***, value: assetForm.object_type_uuid }
            ]} />

            <FormCreator form={form} formValueState={[formValues, setFormValue]} className=***REMOVED***-mt-8***REMOVED*** />
            <div className=***REMOVED***flex flex-col gap-8 bg-slate-100 p-4 rounded-md***REMOVED***>
                <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                    <h4 className=***REMOVED***flex flex-row gap-2 items-center***REMOVED***><Network size={14} /> Associated Schema</h4>
                    <div className=***REMOVED***p-4 bg-slate-200 rounded-md***REMOVED***>
                        <p className=***REMOVED***font-semibold***REMOVED***><Link to={`/object_schema/edit/${objectSchema.uuid}`}>{objectSchema.label}</Link></p>
                        <CopyFields fields={[
                            { id: `uuid-${objectSchema.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: objectSchema.uuid },
                            { id: `object_type_uuid-${objectSchema.uuid}`, label: ***REMOVED***Object type***REMOVED***, value: objectSchema.object_type_uuid },
                            { id: `version-${objectSchema.uuid}`, label: ***REMOVED***Version***REMOVED***, value: objectSchema.version }
                        ]} />
                    </div>
                </div>
                <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                    <h4 className=***REMOVED***flex flex-row gap-2 items-center***REMOVED***><Cog size={14} /> Associated Field Overrides{
                        fieldConfigs.length > 0 &&
                        <Link
                            to={`/field_configs/create?form_uuid=${assetForm.uuid}`}
                            className={
                                utils.createButtonClass({
                                    size: ***REMOVED***xs***REMOVED***,
                                    type: ***REMOVED***create***REMOVED***,
                                    className: ***REMOVED***ml-2 gap-1***REMOVED***
                                })
                            }

                        ><Plus /> Create field override for <strong className=***REMOVED***underline underline-offset-2 decoration-dotted***REMOVED***>{assetForm.label}</strong> form</Link>
                    }</h4>
                    <div className=***REMOVED***p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md***REMOVED***>
                        {
                            fieldConfigs.length < 1 && (
                                <div className="flex flex-col gap-4">
                                    <p>No schema found for this object type.</p>
                                    <div>
                                        <Link to={`/field_configs/create?form_uuid=${assetForm.uuid}`} className={utils.createButtonClass({
                                            size: ***REMOVED***md***REMOVED***,
                                            variant: ***REMOVED***primary***REMOVED***
                                        })}>Create schema</Link>
                                    </div>
                                </div>
                            )
                        }
                        {
                            fieldConfigs.map(fieldConfig => {
                                return (<div key={fieldConfig.uuid} className=***REMOVED***p-4 bg-white rounded-md flex flex-col gap-2***REMOVED***>
                                    <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                                        <h2 className=***REMOVED***font-semibold***REMOVED***>{fieldConfig.fields_override_config.label}</h2>
                                        <CopyFields fields={[
                                            { id: `uuid-${fieldConfig.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: fieldConfig.uuid },
                                            { id: `object_schema_uuid-${fieldConfig.uuid}`, label: ***REMOVED***Object schema UUID***REMOVED***, value: fieldConfig.fields_override_config.object_schema_uuid }
                                        ]} />

                                    </div>
                                </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>

            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onUpdate} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}</Button>
            </div>
        </div>
    )
}

const EditFormLoader = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const { data, isLoading, error } = useFullForm({ uuid: uuid ?? ***REMOVED******REMOVED*** })
    return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && <EditForm assetForm={data.form} fieldConfigs={data.field_configs} objectSchema={data.object_schema} />}
    </ViewWithLoader>
}

export default EditFormLoader