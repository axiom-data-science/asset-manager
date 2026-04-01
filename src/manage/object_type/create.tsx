import { Button, Loader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectType } from "@/manage/object_type/types";
import { useNavigate } from "react-router-dom";

const CreateObjectType = (): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>({
        ***REMOVED***auto-slug***REMOVED***: true
    });
    const auth = useAuth();

    const onSave = () => {
        setSaving(true);
        postObjectType({
            object_type: {
                label: formValue[***REMOVED***label***REMOVED***] as string,
                description: formValue[***REMOVED***description***REMOVED***] as string | undefined,
                slug: formValue[***REMOVED***slug***REMOVED***] as string
            },
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);
            navigate(***REMOVED***/object_type***REMOVED***)
        })
    }

    useEffect(() => {
        if (formValue[***REMOVED***auto-slug***REMOVED***]) {
            const label = formValue[***REMOVED***label***REMOVED***] as string | undefined;
            if (label) {
                const slug = label.toLowerCase().replace(/\s+/g, ***REMOVED***-***REMOVED***).replace(/[^a-z0-9\-]/g, ***REMOVED******REMOVED***);
                setFormValue(prev => ({ ...prev, slug }));
            }
        }
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
                    value: false,
                    operator: ***REMOVED***eq***REMOVED***,
                    result: ***REMOVED***include***REMOVED***
                }
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
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create object type</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

export default CreateObjectType