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
        id: 'create-document',
        settings: {
            show_progress: false
        },
        fields: [
            {
                id: 'label',
                label: 'Label',
                type: 'text',
                required: true
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
                required: true
            },
            {
                id: 'data',
                label: 'Data',
                type: 'json'
            }

        ]
    }

    const onSave = () => {
        setSaving(true);
        postDocument({
            document: {
                object_type_uuid: type.uuid,
                ...formValue
            } as Omit<IDocument<any>, 'uuid' | 'created_at' | 'updated_at'>,
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);

        })

    }


    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Create new {type?.label.toLocaleLowerCase() ?? ''} document</h1>
            <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateDocument = (): ReactElement => {
    const [params] = useSearchParams();
    const objectType = params.get('object_type');
    const version = params.get('version');
    const { data: object_types, isLoading, error } = useObjectTypeList()
    const typeMap = Object.fromEntries(object_types?.items?.map((ot) => [ot.uuid, ot]) ?? [])
    const selectedType = objectType ? typeMap[objectType] : null;
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
        {object_types?.items && (
            selectedType === null
                ? <div className='flex flex-col gap-2'>
                    <h1 className='text-2xl font-bold'>Select document type</h1>

                    {object_types.items.length === 0 && <>
                        <p>No object types found. Please create an object type first.</p>
                        <div className='mt-4'><Link to='/object_type/create' className={utils.createButtonClass({
                            size: 'md',
                            variant: 'primary'
                        })}>Create object type</Link>
                        </div>
                    </>}
                    <div className='flex flex-col gap-2 max-w-70'>
                        {object_types.items.map((ot) => (
                            <Link key={ot.uuid} to={`/document/create?object_type=${ot.uuid}`} className='items-start justify-normal p-2 border rounded hover:bg-gray-100'>{ot.label}</Link>
                        ))}
                    </div>
                </div>
                : <CreateDocumentForm type={selectedType} version={version} />
        )
        }
    </ViewWithLoader>

}



export default CreateDocument