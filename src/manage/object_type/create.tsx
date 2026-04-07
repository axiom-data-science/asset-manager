import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
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
        id: ***REMOVED***create-object-type***REMOVED***,
        settings: {
            show_progress: false
        },
        fields: [
            {
                id: ***REMOVED***category***REMOVED***,
                label: ***REMOVED***Category***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                options: object_categories.map(c => {
                    return { label: c, value: c }
                }),
                required: true,
                settings: {

                }
            },
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
            },
            {
                id: ***REMOVED***create_default_schema***REMOVED***,
                label: ***REMOVED***Create default schema***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            }
        ]
    }

    const schemaFormWithoutSlug: IForm = {
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
            },
            {
                id: ***REMOVED***json_schema***REMOVED***,
                label: ***REMOVED***Schema (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
                required: true
            }
        ]
    }

    const { form, formState: [formValue, setFormValue], filterForSave } = useSlug(
        objectTypeFormWithoutSlug,
        {
            ***REMOVED***category***REMOVED***: object_categories.find(c => c === searchParams.get(***REMOVED***category***REMOVED***)) ?? object_categories.find(d => d.toLowerCase() === ***REMOVED***document***REMOVED***) ?? object_categories[0],
            create_default_schema: true
        },
        [***REMOVED***create_default_schema***REMOVED***]
    );

    const { form: schemaForm, formState: [schemaFormValue, setSchemaFormValue], filterForSave: schemaFilterForSave } = useSlug(
        schemaFormWithoutSlug
    )




    const onSave = async () => {
        setSaving(true);
        try {
            const typeValid = await validate({ form, formValues: formValue });
            const schemaValid = formValue[***REMOVED***create_default_schema***REMOVED***] ? await validate({ form: schemaForm, formValues: schemaFormValue, messagePrefix: ***REMOVED***Default schema***REMOVED*** }) : { valid: true, errors: [] }
            const valid = {
                valid: typeValid.valid && schemaValid.valid,
                errors: [...typeValid.errors, ...schemaValid.errors]
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
            const valuesToSave = filterForSave(formValue);
            const newObjectType = await postObjectType({
                object_type: valuesToSave as Omit<IObjectType, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })
            if (formValue[***REMOVED***create_default_schema***REMOVED***]) {
                const schemaValuesToSave = schemaFilterForSave(schemaFormValue);
                schemaValuesToSave[***REMOVED***object_type_uuid***REMOVED***] = newObjectType.uuid;
                schemaValuesToSave[***REMOVED***is_type_default***REMOVED***] = true;
                await postObjectSchema({
                    object_schema: schemaValuesToSave as Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                    token: auth.user?.access_token ?? ***REMOVED******REMOVED***
                });
            }
            setSaving(false);
            navigate(***REMOVED***/object_type***REMOVED***)
        } catch (e: unknown) {
            setSaving(false);
            setErrorMessages([{ field: ***REMOVED***form***REMOVED***, message: `An error occurred while saving. Please try again. ${(e as Error)?.message ?? ***REMOVED******REMOVED***}` }])
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
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create object type</h1>
            {
                errorMessages.length > 0 && <div className=***REMOVED***p-4 bg-red-100 border border-red-400 text-red-700 rounded***REMOVED***>
                    <ul className=***REMOVED***list-disc list-inside***REMOVED***>
                        {errorMessages.map((err, i) => <li key={i}>{err.message}</li>)}
                    </ul>
                </div>
            }
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            {
                formValue[***REMOVED***create_default_schema***REMOVED***] && <div className=***REMOVED***flex flex-col gap-4 p-4 bg-slate-100 border-2 shadow-md rounded***REMOVED***>
                    <h5 className=***REMOVED***text-slate-800 font-bold***REMOVED***>Default schema details</h5>
                    <div className=***REMOVED***flex flex-wrap scale-96 -mt-[4%]***REMOVED***>
                        <FormCreator form={schemaForm} formValueState={[schemaFormValue, setSchemaFormValue]} />
                    </div>
                </div>
            }
            <div className=***REMOVED***flex flex-row gap-2 sticky bg-white/80 bottom-0 py-4***REMOVED***>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
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