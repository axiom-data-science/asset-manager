import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import { useSlug } from "../components/useSlug";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useObjectSchemaList } from "@/manage/object_schema/useObjectSchemaList";
import CopyField from "@/manage/components/copy_field";
import ObjectTypeLoader from "@/manage/components/object_type_loader";

const LatestVersionAtType = ({ object_type_uuid }: { object_type_uuid: string }) => {
    const { data: schemas, isLoading, error } = useObjectSchemaList({
        params: {
            filters: [
                {
                    column: 'object_type_uuid',
                    value: object_type_uuid,
                    operator: 'eq'
                }
            ]
        }
    })
    const lastSchema = schemas?.sort((a, b) => b.version - a.version)[0];
    return <ViewWithLoader isLoading={isLoading} error={error} data={schemas}>
        <CopyField label="Version" value={lastSchema ? (lastSchema.version + 1).toString() : '1'} id='version' />
    </ViewWithLoader>
}


const CreateObjectSchemaForm = ({ object_types, type }: { object_types: IObjectType[], type: IObjectType }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);

    const onSave = async () => {
        const valuesToSave = filterForSave(formValue);
        const valid = await validate({ form, formValues: valuesToSave });
        if (!valid.valid && valid.errors.length > 0) {
            setErrorMessages(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return;
        }
        setSaving(true);
        postObjectSchema({
            object_schema: {
                ...valuesToSave as Omit<IObjectSchema, 'uuid' | 'created_at' | 'updated_at'>
            },
            token: auth.user?.access_token ?? ''
        }).then(() => {
            setSaving(false);
            navigate('/object_schema')
        })
    }



    const formWithoutSlug: IForm = {
        id: 'create-object-type',
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
                id: 'object_type_uuid',
                label: 'Type',
                type: 'select',
                options: object_types.map(ot => ({ label: ot.label, value: ot.uuid })),
                required: true
            },
            {
                id: 'version',
                label: 'Version',
                type: 'custom:version',
                conditions: {
                    field: 'object_type_uuid',
                    result: 'include'

                }
            },
            {
                id: 'is_type_default',
                label: 'Is default schema for selected type',
                type: 'boolean'
            },
            {
                id: 'description',
                label: 'Description',
                type: 'long_text',
            },
            {
                id: 'json_schema',
                label: 'Schema (JSON)',
                type: 'json',
                required: true
            }
        ]
    }

    const { form, formState: [formValue, setFormValue], filterForSave } = useSlug(
        formWithoutSlug,
        {
            object_type_uuid: type.uuid
        },
        ['version'],
    )

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to create an object type.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Create schema</h1>
            <Errors errors={errorMessages} />
            <FormCreator
                form={form}
                formValueState={[formValue, setFormValue]}
                inputOverrides={{
                    'custom:version': (props) => {
                        if (!formValue.object_type_uuid) {
                            return <></>
                        } else {
                            return <div className='max-w-40'><LatestVersionAtType object_type_uuid={String(formValue.object_type_uuid)} /></div>
                        }
                    }
                }}

            />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const CreateObjectSchema = ({ type }: { type: IObjectType }): ReactElement => {
    const { data: object_types, isLoading, error } = useObjectTypeList()
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
            {
                object_types && <CreateObjectSchemaForm object_types={object_types} type={type} />
            }
        </ViewWithLoader>
    )
}

const CreateObjectSchemaWithType = (): ReactElement => {
    return (
        <ObjectTypeLoader urlRoot="/object_schema/create" View={CreateObjectSchema} />
    )
}

export default CreateObjectSchemaWithType