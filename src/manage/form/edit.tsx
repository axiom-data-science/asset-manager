import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import { type IValidationError, type IAssetForm } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { formQueryKey, useForm } from "@/manage/form/useForm";
import { useQueryClient } from "@tanstack/react-query";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { CopyFields } from "../components/copy_field";
import { formListQueryKey } from "./useFormList";

const EditForm = ({
    assetForm
}: {
    assetForm: IAssetForm
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
            navigate(***REMOVED***/form***REMOVED***)
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
            <div>
                <Button onClick={onUpdate} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}</Button>
            </div>
        </div>
    )
}

const EditFormLoader = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const { data: form, isLoading, error } = useForm(uuid ?? ***REMOVED******REMOVED***)
    return <ViewWithLoader isLoading={isLoading} error={error} data={form}>
        {form && <EditForm assetForm={form} />}
    </ViewWithLoader>
}

export default EditFormLoader