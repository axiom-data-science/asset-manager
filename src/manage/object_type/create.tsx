import { Button, Loader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import { useNavigate } from "react-router-dom";
import type { IObjectSchema, IObjectType, IValidationError } from "@/types/types";
import { postObjectSchema } from "@/manage/object_schema/services";
import { validate } from "@/lib/utils";
import Errors from "../form/components/errors";

const CreateObjectType = (): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [errorMessages, setErrorMessages] = useState<IValidationError[]>([])
    const [formValue, setFormValue] = useState<IFormValues>({
        ***REMOVED***auto-slug***REMOVED***: true
    });
    const auth = useAuth();


    const onSave = async () => {
        setSaving(true);
        const typeValie = await validate({ form, formValues: formValue });
        const schemaValid = formValue[***REMOVED***create_default_schema***REMOVED***] ? await validate({ form: schemaForm, formValues: schemaFormValue, messagePrefix: ***REMOVED***Default schema***REMOVED*** }) : { valid: true, errors: [] }
        const valid = {
            valid: typeValie.valid && schemaValid.valid,
            errors: [...typeValie.errors, ...schemaValid.errors]
        }
        if (!valid.valid) {
            setSaving(false)
            setErrorMessages(valid.errors)
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
            return
        }
        setErrorMessages([])
        const { ***REMOVED***auto-slug***REMOVED***: _, ***REMOVED***create_default_schema***REMOVED***: __, ...valuesToSave } = formValue;
        const newObjectType = await postObjectType({
            object_type: valuesToSave as Omit<IObjectType, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        })
        if (formValue[***REMOVED***create_default_schema***REMOVED***]) {
            const { ***REMOVED***auto-slug***REMOVED***: _, ...schemaValuesToSave } = schemaFormValue
            schemaValuesToSave[***REMOVED***object_type_uuid***REMOVED***] = newObjectType.uuid;
            schemaValuesToSave[***REMOVED***is_type_default***REMOVED***] = true;
            await postObjectSchema({
                object_schema: schemaValuesToSave as Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            });
        }
        setSaving(false);
        navigate(***REMOVED***/object_type***REMOVED***)
    }

    const updateSlug = (value: IFormValues, setter: React.Dispatch<React.SetStateAction<IFormValues>>) => {
        const autoSlug = Boolean(value[***REMOVED***auto-slug***REMOVED***]);
        const label = value[***REMOVED***label***REMOVED***] as string | undefined;
        if (autoSlug && label !== undefined) {
            const slug = label.toLowerCase().replace(/\s+/g, ***REMOVED***-***REMOVED***).replace(/[^a-z0-9-]/g, ***REMOVED******REMOVED***);
            setter(prev => ({ ...prev, slug }));
        }
    }

    useEffect(() => {
        updateSlug(formValue, setFormValue);
    }, [formValue[***REMOVED***label***REMOVED***], formValue[***REMOVED***auto-slug***REMOVED***]])

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
                id: ***REMOVED***auto-slug***REMOVED***,
                label: ***REMOVED***Auto-generate slug from label***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            },
            {
                id: ***REMOVED***slug***REMOVED***,
                label: ***REMOVED***Slug***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true,
                conditions: {
                    field: ***REMOVED***auto-slug***REMOVED***,
                    value: true,
                    operator: ***REMOVED***eq***REMOVED***,
                    result: ***REMOVED***disable***REMOVED***
                }
            },
            {
                id: ***REMOVED***description***REMOVED***,
                label: ***REMOVED***Description***REMOVED***,
                type: ***REMOVED***long_text***REMOVED***,
            },
            {
                id: ***REMOVED***create_default_schema***REMOVED***,
                label: ***REMOVED***Create default schema***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***,
                defaultValue: false
            }
        ]
    }

    const schemaForm: IForm = {
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
                id: ***REMOVED***auto-slug***REMOVED***,
                label: ***REMOVED***Auto-generate slug from label***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            },
            {
                id: ***REMOVED***slug***REMOVED***,
                label: ***REMOVED***Slug***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true,
                conditions: {
                    field: ***REMOVED***auto-slug***REMOVED***,
                    value: true,
                    operator: ***REMOVED***eq***REMOVED***,
                    result: ***REMOVED***disable***REMOVED***
                }
            },
            {
                id: ***REMOVED***description***REMOVED***,
                label: ***REMOVED***Description***REMOVED***,
                type: ***REMOVED***long_text***REMOVED***,
            },
            {
                id: ***REMOVED***schema***REMOVED***,
                label: ***REMOVED***Schema (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
                required: true
            }
        ]
    }
    const [schemaFormValue, setSchemaFormValue] = useState<IFormValues>({
        ***REMOVED***auto-slug***REMOVED***: true
    });

    useEffect(() => {
        updateSlug(schemaFormValue, setSchemaFormValue);
    }, [schemaFormValue[***REMOVED***label***REMOVED***], schemaFormValue[***REMOVED***auto-slug***REMOVED***]])

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
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create object type</h1>
            <Errors errors={errorMessages} />
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            {
                formValue[***REMOVED***create_default_schema***REMOVED***] && <div className=***REMOVED***flex flex-col gap-4 p-4 bg-slate-100 border-2 shadow-md rounded***REMOVED***>
                    <h5 className=***REMOVED***text-slate-800 font-bold***REMOVED***>Default schema details</h5>
                    <div className=***REMOVED***flex flex-wrap scale-96 -mt-[4%]***REMOVED***>
                        <FormCreator form={schemaForm} formValueState={[schemaFormValue, setSchemaFormValue]} />
                    </div>
                </div>
            }
            <div>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

export default CreateObjectType