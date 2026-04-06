import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchObjectType } from "@/manage/object_type/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IObjectType } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";
import { getObjectTypeQuery, objectTypeQueryKey } from "@/manage/object_type/useObjectType";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { CopyFields } from "../components/copy_field";
import { getFormListForObjectTypeQueryOptions } from "../form/useFormList";
import Link from ***REMOVED***@/manage/components/link***REMOVED***

const EditObjectTypeForm = ({
    object_type,
    forms
}: {
    object_type: IObjectType,
    forms: IAssetForm[]
}): ReactElement => {

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>(object_type as unknown as IFormValues);
    const auth = useAuth();
    const navigate = useNavigate()

    const onUpdate = () => {
        setSaving(true);
        patchObjectType({
            uuid: object_type.uuid,
            object_type: formValue as unknown as IObjectType,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);
            queryClient.invalidateQueries(
                { queryKey: objectTypeQueryKey(object_type.uuid) }
            );
            queryClient.invalidateQueries({ queryKey: [***REMOVED***object_type_list***REMOVED***] })
            navigate(***REMOVED***/object_type***REMOVED***)
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
                defaultValue: object_type.slug
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
            <CopyFields fields={[
                { id: ***REMOVED***slug***REMOVED***, label: ***REMOVED***Slug***REMOVED***, value: object_type.slug },
                { id: ***REMOVED***uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: object_type.uuid }
            ]} />
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <h4 className=***REMOVED***font-bold text-slate-600***REMOVED***>Associated Forms</h4>
            <div className=***REMOVED***p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md***REMOVED***>
                {
                    forms.map(form => {
                        return (<div key={form.uuid} className=***REMOVED***p-4 bg-white rounded-md flex flex-col gap-2***REMOVED***>
                            <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                                
                                    <Link to={`/forms/edit/${form.uuid}`}><h2 className=***REMOVED***font-semibold***REMOVED***>{form.label}</h2></Link>
                                    <CopyFields fields={[
                                        { id: `slug-${form.uuid}`, label: ***REMOVED***Slug***REMOVED***, value: form.slug },
                                        { id: `uuid-${form.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: form.uuid }
                                    ]} />
                               
                            </div>
                            <p className=***REMOVED***text-sm text-gray-600***REMOVED***>{form.description}</p>
                        </div>
                        )
                    })
                }
            </div>
            <div>
                <Button onClick={onUpdate} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}</Button>
            </div>
        </div>
    )
}


const EditObjectType = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid
    const auth = useAuth();

    const queryObject = {
        object_type: getObjectTypeQuery(uuid ?? ***REMOVED******REMOVED***, auth.user?.access_token ?? ***REMOVED******REMOVED***),
        forms: getFormListForObjectTypeQueryOptions({object_type_uuid: uuid ?? ***REMOVED******REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***})
    }

    
    const {isLoading, error, data} = useQueries({
        queries: Object.values(queryObject),
        combine: (results) => {
            const isLoading = results.some(r => r.isLoading);
            return {
                isLoading,
                isPending: results.some(r => r.isPending),
                error: results.find(r => r.error)?.error ?? null,
                data: !isLoading ? Object.fromEntries(results.map((r, index) => r.data ? [Object.keys(queryObject)[index], r.data] : [])) : null
            }
        }
    })


    console.log(data)

    //const { data: object_type, isLoading, error } = useObjectType(uuid ?? ***REMOVED******REMOVED***)
    return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && <EditObjectTypeForm object_type={data.object_type} forms={data.forms} />}
    </ViewWithLoader>
}

export default EditObjectType