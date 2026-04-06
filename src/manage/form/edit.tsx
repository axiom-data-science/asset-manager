import { Button, Input, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { formQueryKey, useForm } from "@/manage/form/useForm";
import { useQueryClient } from "@tanstack/react-query";

const EditForm = ({
    assetForm
}: {
    assetForm: IAssetForm
}): ReactElement => {

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(assetForm as unknown as IFormValues);
    const auth = useAuth();
    const navigate = useNavigate()

    const onUpdate = () => {
        setSaving(true);
        patchForm({
            uuid: assetForm.uuid,
            form: formValue as unknown as IAssetForm,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: formQueryKey(assetForm.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: [***REMOVED***form_list***REMOVED***] })
            navigate(***REMOVED***/form***REMOVED***)
        })
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
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Edit object type</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <Input id=***REMOVED***slug***REMOVED*** testId=***REMOVED***slug***REMOVED*** type=***REMOVED***text***REMOVED*** label=***REMOVED***Slug***REMOVED*** value={assetForm.slug} disabled={true} />
            <Input id=***REMOVED***uuid***REMOVED*** testId="uuid" type=***REMOVED***text***REMOVED*** label=***REMOVED***UUID***REMOVED*** value={assetForm.uuid} disabled={true} />
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