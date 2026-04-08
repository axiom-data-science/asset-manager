import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate, useParams } from "react-router-dom";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useObjectSchemaFull } from "@/manage/object_schema/useObjectSchema";
import { omit } from "lodash-es";
import { CopyButton, CopyFields } from "@/manage/components/copy_field";
import { Check, X } from "lucide-react";




const CreateObjectSchemaForm = ({ object_schema, object_types }: { object_schema: IObjectSchema, object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);
    const [formValues, setFormValues] = useState<IFormValues>(omit(object_schema, ***REMOVED***is_type_default***REMOVED***, ***REMOVED***json_config***REMOVED***, ***REMOVED***owner_sub***REMOVED***, ***REMOVED***uuid***REMOVED***, ***REMOVED***created_at***REMOVED***, ***REMOVED***updated_at***REMOVED***) as IFormValues);
    const objectTypeMap = Object.fromEntries(object_types.map(ot => [ot.uuid, ot]))

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
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create schema</h1>
            <Errors errors={errorMessages} />
            <CopyFields fields={[
                { id: ***REMOVED***object_type_uuid***REMOVED***, label: ***REMOVED***Object type***REMOVED***, value: objectTypeMap[object_schema.object_type_uuid]?.label ?? object_schema.object_type_uuid },
                { id: ***REMOVED***version***REMOVED***, label: ***REMOVED***Version***REMOVED***, value: object_schema.version },
                { id: ***REMOVED***is_type_default***REMOVED***, label: ***REMOVED***Is default schema for object type?***REMOVED***, value: object_schema.is_type_default ? <Check size={22} color=***REMOVED***green***REMOVED*** /> : <X size={22} color="red" />, noCopy: true }
            ]}
            />
            <FormCreator
                form={form}
                formValueState={[formValues, setFormValues]}
            />
            <div>
                <p className=***REMOVED***font-bold***REMOVED***>JSON config</p>
                <pre className=***REMOVED***max-h-125 overflow-scroll bg-gray-100 p-4 rounded text-xs relative***REMOVED***>
                    <span className=***REMOVED***cursor-pointer absolute right-4 top-4 text-slate-400***REMOVED***>
                        <CopyButton value={JSON.stringify(object_schema.json_schema, null, 2)} size={48} />
                    </span>


                    {JSON.stringify(object_schema.json_schema, null, 2)}
                </pre>
            </div>
            <div>
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
                data && <CreateObjectSchemaForm object_schema={data.object_schema} object_types={data.object_types} />
            }
        </ViewWithLoader>
    )
}


export default EditObjectSchema