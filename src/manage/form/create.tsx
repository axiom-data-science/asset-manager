import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useEffect, useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";

const CreateForm = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>({
        ***REMOVED***auto-slug***REMOVED***: true
    });
    const auth = useAuth();

    const onSave = () => {
        setSaving(true);
        const { ***REMOVED***auto-slug***REMOVED***: _, ...valuesToSave } = formValue;
        postForm({
            form: {
                ...valuesToSave as Omit<IAssetForm, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
            },
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);
            navigate(***REMOVED***/form***REMOVED***)
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
        id: ***REMOVED***create-form***REMOVED***,
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
                id: ***REMOVED***is_type_default***REMOVED***,
                label: ***REMOVED***Is default form for selected type***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***,
                required: true
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
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create form</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

const CreateFormLoader = (): ReactElement => {
    const { data: object_type, isLoading, error } = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
            {
                object_type?.items && <CreateForm object_types={object_type.items} />
            }
        </ViewWithLoader>
    )
}

export default CreateFormLoader