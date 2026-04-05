import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType, IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchObjectTypes } from "@/manage/object_type/services";
import { useSlug } from "@/manage/components/useSlug";
import { validate } from "@/lib/utils";
import Errors from "@/manage/components/errors";

const CreateObjectSchemaForm = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<IValidationError[]>([]);
    const auth = useAuth();

    const onSave = async () => {
        setSaving(true);
        const valuesToSave = filterForSave(formValue);
        const vald = await validate({ form, formValues: formValue });
        if (!vald.valid) {
            setSaving(false);
            setErrors(vald.errors);
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
            return
        }
        try {
            await postObjectSchema({
                object_schema: {
                    ...valuesToSave as Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                },
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })
            setSaving(false);
            navigate(***REMOVED***/object_schema***REMOVED***)
        } catch (e) {
            setSaving(false)
            setErrors([{ field: ***REMOVED***form***REMOVED***, message: ***REMOVED***An error occurred while saving. Please try again.***REMOVED*** }])
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
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
                id: ***REMOVED***is_type_default***REMOVED***,
                label: ***REMOVED***Is default schema for selected type***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
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

    const { form, formState: [formValue, setFormValue], filterForSave } = useSlug(formWithoutSlug);

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
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

const CreateObjectSchema = (): ReactElement => {
    const auth = useAuth();
    const { data: object_types, isLoading, error } = useQuery({
        queryKey: [***REMOVED***object_type_list***REMOVED***],
        queryFn: async ({ signal }) => {
            if (!auth.user) return Promise.resolve([]);
            const data = await fetchObjectTypes({
                token: auth.user.access_token,
                signal
            })
            return data

        }
    })
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {
                object_types && <CreateObjectSchemaForm object_types={object_types} />
            }
        </ViewWithLoader>
    )

}

export default CreateObjectSchema