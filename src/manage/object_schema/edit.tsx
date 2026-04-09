import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate, useParams } from "react-router-dom";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useObjectSchemaFull } from "@/manage/object_schema/useObjectSchema";
import { omit } from "lodash-es";
import { CopyButton, CopyFields } from "@/manage/components/copy_field";
import { BookPlus, Check, X } from "lucide-react";
import Link from "@/manage/components/link";




const CreateObjectSchemaForm = ({ object_schema, object_types, assetForms }: { object_schema: IObjectSchema, object_types: IObjectType[], assetForms: IAssetForm[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);
    const [formValues, setFormValues] = useState<IFormValues>(omit(object_schema, ***REMOVED***is_type_default***REMOVED***, ***REMOVED***json_config***REMOVED***, ***REMOVED***owner_sub***REMOVED***, ***REMOVED***uuid***REMOVED***, ***REMOVED***created_at***REMOVED***, ***REMOVED***updated_at***REMOVED***) as IFormValues);
    const objectTypeMap = Object.fromEntries(object_types.map(ot => [ot.uuid, ot]))
    const objectType = objectTypeMap[object_schema.object_type_uuid]

    const onUpdate = async () => {
        const valid = await validate({ form, formValues });
        if (!valid.valid && valid.errors.length > 0) {
            setErrorMessages(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED***
            })
            return;
        }
        setSaving(true);
        try {
            await patchObjectSchema({
                uuid: object_schema.uuid,
                object_schema: {
                    ...formValues as Omit<IObjectSchema, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
                },
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })
            setSaving(false);
            navigate(***REMOVED***/object_schema***REMOVED***)
        } catch (e) {
            setSaving(false);
            setErrorMessages([{ field: ***REMOVED***form***REMOVED***, message: `An error occurred while creating the object schema. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ***REMOVED******REMOVED***}` }])
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED***
            })
        }
    }

    const form: IForm = {
        id: ***REMOVED***create-object-type***REMOVED***,
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
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Edit schema details</h1>
            <Errors errors={errorMessages} />
            <FormCreator
                form={form}
                formValueState={[formValues, setFormValues]}
            />
            <div className=***REMOVED***p-4 bg-slate-100 flex flex-col gap-8 rounded***REMOVED***>
                <div>
                    <h4>Schema version</h4>
                    <div className=***REMOVED***p-4 bg-slate-200 rounded-md***REMOVED***>
                        <p className=***REMOVED***font-semibold***REMOVED***>{object_schema.version}</p>
                    </div>
                </div>
                <div>
                    <h4>Is default schema for object type?</h4>
                    <div className=***REMOVED***p-4 bg-slate-200 rounded-md flex items-center gap-2***REMOVED***>
                        {object_schema.is_type_default ? <Check size={22} color=***REMOVED***green***REMOVED*** /> : <X size={22} color="red" />}
                        <span>{object_schema.is_type_default ? ***REMOVED***Yes***REMOVED*** : ***REMOVED***No***REMOVED***}</span>
                    </div>
                </div>
                <div>
                    <p className=***REMOVED***mb-2***REMOVED***>JSON config</p>
                    <pre className=***REMOVED***max-h-125 overflow-scroll bg-slate-200 p-4 rounded-md text-xs relative whitespace-pre-wrap***REMOVED***>
                        <span className=***REMOVED***cursor-pointer absolute right-4 top-4 text-slate-400***REMOVED***>
                            <CopyButton value={JSON.stringify(object_schema.json_schema, null, 2)} size={48} />
                        </span>


                        {JSON.stringify(object_schema.json_schema, null, 2)}
                    </pre>
                </div>
                <div>
                    <h4>Associated Type</h4>
                    <div className=***REMOVED***p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md***REMOVED***>
                        <div className=***REMOVED***mb-4 bg-white p-4 rounded-md***REMOVED***>
                            <p className=***REMOVED***font-semibold***REMOVED***><Link to={`/object_type/edit/${objectType.uuid}`}>{objectType.label} ({objectType.category})</Link></p>
                            <CopyFields stack={true} fields={[
                                { id: `uuid-${objectType.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: objectType.uuid },
                            ]} />
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className=***REMOVED***flex flex-row gap-2 items-center***REMOVED***><BookPlus size={18} />Associated Forms</h4>
                    <div className=***REMOVED***p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md***REMOVED***>
                        {assetForms.map(assetForm => {
                            return (
                                <div key={assetForm.uuid} className=***REMOVED***mb-4 bg-white p-4 rounded-md***REMOVED***>
                                    <p className=***REMOVED***font-semibold***REMOVED***><Link to={`/forms/edit/${assetForm.uuid}`}>{assetForm.label}</Link></p>
                                    <CopyFields stack={true} fields={[
                                        { id: `uuid-${assetForm.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: assetForm.uuid },
                                        { id: `slug-${assetForm.uuid}`, label: ***REMOVED***Slug***REMOVED***, value: assetForm.slug },
                                        { id: `version-${assetForm.uuid}`, label: ***REMOVED***Schema version***REMOVED***, value: assetForm.object_schema_version }
                                    ]} />
                                </div>
                            )
                        }) ?? <p>No forms associated with this schema.</p>}
                    </div>
                </div>
            </div>


            <div className=***REMOVED***flex flex-row sticky bottom-0 bg-white/80 py-4***REMOVED***>
                <Button onClick={onUpdate} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}</Button>
            </div>
        </div>
    )
}

const EditObjectSchema = (): ReactElement => {
    const params = useParams()
    const { data, isLoading, error } = useObjectSchemaFull({ uuid: params.uuid })
    if (params.uuid === null || params.uuid === undefined) {
        return (
            <div className="p-20">
                <p>Invalid object schema UUID.</p>
            </div>
        )
    }
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {
                data && <CreateObjectSchemaForm object_schema={data.object_schema} object_types={data.object_types} assetForms={data.forms} />
            }
        </ViewWithLoader>
    )
}


export default EditObjectSchema