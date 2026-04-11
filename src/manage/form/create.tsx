import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IFormToFieldConfig, IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate } from "react-router-dom";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useSlug } from "@/manage/components/useSlug";
import ObjectTypeLoader from "@/manage/components/object_type_loader";
import { useSchemaListForObjectType } from "@/manage/object_schema/useDefaultSchemaForType";
import { postFieldConfig, postFormToFieldsConfig } from "@/manage/field_config/services";
import Link from "@/manage/components/link";

const CreateForm = ({ type, schemas }: { type: IObjectType, schemas: IObjectSchema[] }): ReactElement => {

    const navigate = useNavigate()
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ field: string, message: string }[]>([]);
    const auth = useAuth();
    const schemasByVersion = Object.fromEntries(schemas.map(s => [s.version, s]))
    const onSave = async () => {
        const valuesToSave = filterForSave(formValues);
        const valid = await validate({ form, formValues: valuesToSave });
        if (!valid.valid && valid.errors.length > 0) {
            setErrors(valid.errors);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
            return;
        }
        setSaving(true);

        try {
            const newForm = await postForm({
                form: {
                    ...valuesToSave as Omit<IAssetForm, 'uuid' | 'created_at' | 'updated_at'>,
                    object_type_uuid: type.uuid
                },
                token: auth.user?.access_token ?? ''
            })

            const formFieldOverrideConfigs: {
                config: JSON,
                weight: number,
                label: string
            }[] = (Array.isArray(formValues.field_override_configs) ? formValues.field_override_configs : []) as {
                config: JSON,
                weight: number,
                label: string
            }[];

            await Promise.all(formFieldOverrideConfigs.map(async (overrideConfig) => {
                const schemaForVersion = schemasByVersion[+formValues.object_schema_version!]
                if (schemaForVersion !== undefined && overrideConfig.config !== null && overrideConfig.weight !== undefined && overrideConfig.label !== undefined && JSON.stringify(overrideConfig.config) !== '') {
                    const formFieldOverrideConfig = await postFieldConfig({
                        fields_override_config: {
                            label: overrideConfig.label,
                            config: overrideConfig.config,
                            object_schema_uuid: schemaForVersion.uuid,
                            object_schema_version: schemaForVersion.version
                        },
                        token: auth.user?.access_token ?? ''
                    })
                    await postFormToFieldsConfig({
                        formToFieldsConfig: {
                            form_uuid: newForm.uuid,
                            fields_override_config_uuid: formFieldOverrideConfig.uuid,
                            weight: +overrideConfig.weight
                        } as unknown as Omit<IFormToFieldConfig, 'uuid' | 'created_at' | 'updated_at'>,
                        token: auth.user?.access_token ?? ''
                    })
                }

            }))

            setSaving(false);
            navigate('/forms')
        } catch (e: unknown) {
            setSaving(false);
            setErrors([{ field: 'form', message: (e as Error).message ?? 'An error occurred while saving the form.' }]);
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds a gradual animation
            })
        }
    }



    const formWithoutSlug: IForm = {
        id: 'create-form',
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
            },
            {
                id: 'object_schema_version',
                label: 'Object schema version',
                type: 'select',
                options: schemas.map(schema => ({ label: `${schema.version.toString()}${schema.is_type_default ? ' (default)' : ''}`, value: schema.version })),
                required: true
            },
            {
                id: 'is_schema_and_version_default',
                label: 'Is default for object type and schema version?',
                type: 'boolean',
                description: 'If true, this form will be the default form for the selected object schema version. If false, it will not be the default form, but can still be selected when creating or editing an object.'
            },
            {
                id: 'use_form_config',
                label: 'Use form config rather than overriding schema',
                type: 'boolean',
                description: 'If true, the form will use the provided form configuration rather than generating a form based on the object schema. This allows for more customization, but requires you to provide a complete form configuration.'
            },
            {
                id: 'form_config_wrap',
                label: 'Form creation',
                type: 'object',
                skip_path: true,
                conditions: {
                    "field": 'use_form_config',
                    "value": false,
                    "result": "disable"
                },
                fields: [
                    {
                        id: 'form_config',
                        label: 'Form configuration (JSON)',
                        description: 'Provide a complete form configuration. The schema will not be used at all to generate the form, so this allows for maximum customization. However, you must provide a complete form configuration with all necessary fields.',
                        type: 'json',
                        conditions: {
                            "field": 'use_form_config',
                            "value": false,
                            "result": "disable"
                        }
                    }

                ]
            },
            {
                id: 'schema_overries',
                label: 'Schema overrides',
                skip_path: true,
                type: 'object',
                conditions: {
                    "field": 'use_form_config',
                    "value": true,
                    "result": "disable"
                },
                fields: [
                    {
                        id: 'schema_override_config',
                        label: 'Schema override form configuration (JSON)',
                        description: 'Provide a form configuration to override the default form configuration generated from the object schema. There are some limitations. For instance, nested objects can not be customized.',
                        type: 'json'

                    },
                    {
                        id: 'field_override_configs',
                        label: 'Schema field override configurations (JSON)',
                        type: 'object',
                        multiple: true,
                        fields: [
                            {
                                id: 'label',
                                label: 'Label',
                                type: 'text',
                                required: true
                            },
                            {
                                id: 'weight',
                                label: 'Weight',
                                type: 'number',
                                defaultValue: 0
                            },
                            {
                                id: 'config',
                                label: 'Field override configurations (JSON)',
                                description: `Provide an array of field override configs. Each config should include the id (as \`prop\`) of the field to override and the config to override with. **Example:** 
                        \`[{"prop": "field_to_override", "type":"radio", "options": [{"label": "Option 1", "value": "option_1"}, {"label": "Option 2", "value": "option_2"}]}]\``,
                                type: 'json'
                            }
                        ]
                    }

                ]
            }
        ]
    }

    const { form, formState: [formValues, setFormValue], filterForSave } = useSlug(
        formWithoutSlug,
        {
            object_schema_version: schemas.find(s => s.is_type_default)?.version.toString() ?? schemas.sort((a, b) => b.version - a.version)[0]?.version.toString() ?? '',
        },
        ['field_override_configs']
    );

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
            <h4 className='text-sm text-gray-500'>Object type: <Link to={`/object_type/edit/${type.uuid}`} className='font-semibold'>{type.label}</Link></h4>
            <h1 className='text-2xl font-bold'>Create form</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValue]} />
            <div className='flex flex-row sticky bottom-0 py-4 bg-white/80'>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </div>
    )
}

const LoadSchemaVersions = ({ type }: { type: IObjectType }): ReactElement => {
    const { data: schemas, isLoading, error } = useSchemaListForObjectType(type.uuid)
    return <ViewWithLoader isLoading={isLoading} error={error} data={schemas}>
        {
            schemas && (
                <CreateForm type={type} schemas={schemas} />
            )
        }
    </ViewWithLoader>
}


const CreateFormLoader = (): ReactElement => {
    return <ObjectTypeLoader urlRoot="/forms/create" View={LoadSchemaVersions} />
}

export default CreateFormLoader