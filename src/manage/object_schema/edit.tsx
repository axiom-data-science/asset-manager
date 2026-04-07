import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { patchObjectSchema, postObjectSchema } from "@/manage/object_schema/services";
import { useAuth } from "@/auth/useAuth";
import type { IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate, useParams } from "react-router-dom";
import { useSlug } from "../components/useSlug";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useObjectSchema, useObjectSchemaFull } from "@/manage/object_schema/useObjectSchema";
import { omit } from "lodash-es";
import { CopyButton, CopyFields } from "@/manage/components/copy_field";
import { Check, Copy, X } from "lucide-react";




const CreateObjectSchemaForm = ({ object_schema, object_types }: { object_schema: IObjectSchema, object_types: IObjectType[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const auth = useAuth();
    const [errorMessages, setErrorMessages] = useState<{ field: string, message: string }[]>([]);
    const [formValues, setFormValues] = useState<IFormValues>(omit(object_schema, 'is_type_default', 'json_config', 'owner_sub', 'uuid', 'created_at', 'updated_at') as IFormValues);
    const objectTypeMap = Object.fromEntries(object_types.map(ot => [ot.uuid, ot]))

    const onUpdate = async () => {
        const valid = await validate({ form, formValues });
        if (!valid.valid && valid.errors.length > 0) {
            setErrorMessages(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
            return;
        }
        setSaving(true);
        try {
            await patchObjectSchema({
                uuid: object_schema.uuid,
                object_schema: {
                    ...formValues as Omit<IObjectSchema, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>
                },
                token: auth.user?.access_token ?? ''
            })
            setSaving(false);
            navigate('/object_schema')
        } catch (e) {
            setSaving(false);
            setErrorMessages([{ field: 'form', message: `An error occurred while creating the object schema. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ''}` }])
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }
    }

    const form: IForm = {
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
                id: 'description',
                label: 'Description',
                type: 'long_text',
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
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>Create schema</h1>
            <Errors errors={errorMessages} />
            <CopyFields fields={[
                { id: 'object_type_uuid', label: 'Object type', value: objectTypeMap[object_schema.object_type_uuid]?.label ?? object_schema.object_type_uuid },
                { id: 'version', label: 'Version', value: object_schema.version },
                { id: 'is_type_default', label: 'Is default schema for object type?', value: object_schema.is_type_default ? <Check size={22} color='green' /> : <X size={22} color="red" />, noCopy: true }
            ]}
            />
            <FormCreator
                form={form}
                formValueState={[formValues, setFormValues]}
            />
            <div>
                <p className='font-bold'>JSON config</p>
                <pre className='max-h-125 overflow-scroll bg-gray-100 p-4 rounded text-xs relative'>
                    <span className='cursor-pointer absolute right-4 top-4 text-slate-400'>
                        <CopyButton value={JSON.stringify(object_schema.json_schema, null, 2)} size={48} />
                    </span>


                    {JSON.stringify(object_schema.json_schema, null, 2)}
                </pre>
            </div>
            <div>
                <Button onClick={onUpdate} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Update'}</Button>
            </div>
        </div>
    )
}

const EditObjectSchema = (): ReactElement => {
    const params = useParams()
    const { data, isLoading, error } = useObjectSchemaFull({ uuid: params.uuid })
    if (params.uuid === null || params.uuid === undefined) {
        return (
            <div className="p-20">
                <p>Invalid object schema UUID.</p>
            </div>
        )
    }
    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {
                data && <CreateObjectSchemaForm object_schema={data.object_schema} object_types={data.object_types} />
            }
        </ViewWithLoader>
    )
}


export default EditObjectSchema