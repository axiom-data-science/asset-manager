import { useAuth } from "@/auth/useAuth";
import { postDocument } from "@/manage/document/services";
import type { IObjectType } from "@/types/types";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import type { IDocument } from "@/types/types";
import { FormCreator, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Button, Loader, utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom"

const CreateDocumentForm = ({
    type,
    version
}: {
    type: IObjectType,
    version?: string | null
}): ReactElement => {
    const [saving, setSaving] = useState(false);
    const [formValue, setFormValue] = useState<IFormValues>({});
    const auth = useAuth()
    const form: IForm = {
        id: ***REMOVED***create-document***REMOVED***,
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
                required: true
            },
            {
                id: ***REMOVED***data***REMOVED***,
                label: ***REMOVED***Data***REMOVED***,
                type: ***REMOVED***json***REMOVED***
            }

        ]
    }

    const onSave = () => {
        setSaving(true);
        postDocument({
            document: {
                object_type_uuid: type.uuid,
                ...formValue
            } as Omit<IDocument<any>, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
        }).then(() => {
            setSaving(false);

        })

    }


    return (
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create new {type?.label.toLocaleLowerCase() ?? ***REMOVED******REMOVED***} document</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </div>
    )
}

const CreateDocument = (): ReactElement => {
    const [params] = useSearchParams();
    const objectType = params.get(***REMOVED***object_type***REMOVED***);
    const version = params.get(***REMOVED***version***REMOVED***);
    const { data: object_types, isLoading, error } = useObjectTypeList()
    const typeMap = Object.fromEntries(object_types?.items?.map((ot) => [ot.uuid, ot]) ?? [])
    const selectedType = objectType ? typeMap[objectType] : null;
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
        {object_types?.items && (
            selectedType === null
                ? <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                    <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Select document type</h1>

                    {object_types.items.length === 0 && <>
                        <p>No object types found. Please create an object type first.</p>
                        <div className=***REMOVED***mt-4***REMOVED***><Link to=***REMOVED***/object_type/create***REMOVED*** className={utils.createButtonClass({
                            size: ***REMOVED***md***REMOVED***,
                            variant: ***REMOVED***primary***REMOVED***
                        })}>Create object type</Link>
                        </div>
                    </>}
                    <div className=***REMOVED***flex flex-col gap-2 max-w-70***REMOVED***>
                        {object_types.items.map((ot) => (
                            <Link key={ot.uuid} to={`/document/create?object_type=${ot.uuid}`} className=***REMOVED***items-start justify-normal p-2 border rounded hover:bg-gray-100***REMOVED***>{ot.label}</Link>
                        ))}
                    </div>
                </div>
                : <CreateDocumentForm type={selectedType} version={version} />
        )
        }
    </ViewWithLoader>

}



export default CreateDocument