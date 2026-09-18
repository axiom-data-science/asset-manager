import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import { useSlug } from "../components/useSlug";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useObjectSchemaList } from "@/manage/object_schema/useObjectSchemaList";
import CopyField from "@/manage/components/copy_field";
import ObjectTypeLoader from "@/manage/components/object_type_loader";

const LatestVersionAtType = ({ object_type_uuid }: { object_type_uuid: string }) => {
    const { data: schemas, isLoading, error } = useObjectSchemaList({
        params: {
            filters: [
                {
                    column: ***REMOVED***object_type_uuid***REMOVED***,
                    value: object_type_uuid,
                    operator: ***REMOVED***eq***REMOVED***
                }
            ]
        }
    })
    const lastSchema = schemas?.sort((a, b) => b.version - a.version)[0];
    return <ViewWithLoader isLoading={isLoading} error={error} data={schemas}>
        <CopyField label="Version" value={lastSchema ? (lastSchema.version + 1).toString() : ***REMOVED***1***REMOVED***} id=***REMOVED***version***REMOVED*** />
    </ViewWithLoader>
}


const CreateObjectSchemaForm = ({ object_types, type }: { object_types: IObjectType[], type: IObjectType }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);

    const onSave = async () => {
        const valuesToSave = filterForSave(formValue);
        const valid = await validate({ form, formValues: valuesToSave });
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
            await postObjectSchema({
                object_schema: {
                    ...valuesToSave as Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
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



    const formWithoutSlug: IForm = {
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
                id: ***REMOVED***object_type_uuid***REMOVED***,
                label: ***REMOVED***Type***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                options: object_types.map(ot => ({ label: ot.label, value: ot.uuid })),
                required: true
            },
            {
                id: ***REMOVED***version***REMOVED***,
                label: ***REMOVED***Version***REMOVED***,
                type: ***REMOVED***custom:version***REMOVED***,
                conditions: {
                    field: ***REMOVED***object_type_uuid***REMOVED***,
                    result: ***REMOVED***include***REMOVED***

                }
            },
            {
                id: ***REMOVED***description***REMOVED***,
                label: ***REMOVED***Description***REMOVED***,
                type: ***REMOVED***long_text***REMOVED***,
            },
            {
                id: ***REMOVED***json_schema***REMOVED***,
                label: ***REMOVED***Schema (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
                required: true
            }
        ]
    }

    const { form, formState: [formValue, setFormValue], filterForSave } = useSlug({
        form: formWithoutSlug,
        initialFormValues: {
            object_type_uuid: type.uuid
        },
        presentationFields: [***REMOVED***version***REMOVED***]
    });

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
            <FormCreator
                form={form}
                formValueState={[formValue, setFormValue]}
                inputOverrides={{
                    ***REMOVED***custom:version***REMOVED***: () => {
                        if (!formValue.object_type_uuid) {
                            return <></>
                        } else {
                            return <div className=***REMOVED***max-w-60***REMOVED***>
                                <LatestVersionAtType object_type_uuid={String(formValue.object_type_uuid)} />
                            </div>
                        }
                    }
                }}

            />
            <div>
                <Button onClick={onSave} type=***REMOVED***default***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

const CreateObjectSchema = ({ type }: { type: IObjectType }): ReactElement => {
    const { data: object_types, isLoading, error } = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {
                object_types && <CreateObjectSchemaForm object_types={object_types} type={type} />
            }
        </ViewWithLoader>
    )
}

const CreateObjectSchemaWithType = (): ReactElement => {
    return (
        <ObjectTypeLoader urlRoot="/object_schema/create" View={CreateObjectSchema} />
    )
}

export default CreateObjectSchemaWithType