import { Button, Input, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectType } from "@/manage/object_type/types";
import { useParams } from "react-router-dom";
import { useObjectType } from "@/manage/object_type/useObjectType";

const EditObjectTypeForm = ({
    object_type
}: {
    object_type: IObjectType
}): ReactElement => {

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(object_type);
    const auth = useAuth();

    const onUpdate = () => {
        setSaving(true);
        postObjectType({
            object_type: formValue as Pick<IObjectType, ***REMOVED***label***REMOVED*** | ***REMOVED***description***REMOVED*** | ***REMOVED***slug***REMOVED***>,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);
        })
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
                type: ***REMOVED***long_text***REMOVED***
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
            <Input id=***REMOVED***slug***REMOVED*** testId=***REMOVED***slug***REMOVED*** type=***REMOVED***text***REMOVED*** label=***REMOVED***Slug***REMOVED*** value={object_type.slug} disabled={true} />
            <Input id=***REMOVED***uuid***REMOVED*** testId="uuid" type=***REMOVED***text***REMOVED*** label=***REMOVED***UUID***REMOVED*** value={object_type.uuid} disabled={true} />
            <div>
                <Button onClick={onUpdate} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}</Button>
            </div>
        </div>
    )
}

const EditObjectType = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const { data: object_type, isLoading, error } = useObjectType(uuid ?? ***REMOVED******REMOVED***)
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
        {object_type && <EditObjectTypeForm object_type={object_type} />}
    </ViewWithLoader>
}

export default EditObjectType