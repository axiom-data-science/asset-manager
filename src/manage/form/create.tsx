import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { FormCreator, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postForm } from "@/manage/form/services";
import { useAuth } from "@/auth/useAuth";
import type { IAssetForm, IFormToFieldConfig, IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate } from "react-router-dom";
import { validate } from "@/lib/utils";
import Errors from "../components/errors";
import { useSlug } from "@/manage/components/useSlug";
import ObjectTypeLoader from "@/manage/components/object_type_loader";
import { useSchemaListForObjectType } from "@/manage/object_schema/useDefaultSchemaForType";
import { postFieldsOverrideConfig, postFormToFieldsConfig } from "@/manage/field_config/services";

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
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
            return;
        }
        setSaving(true);

        try {
            const newForm = await postForm({
                form: {
                    ...valuesToSave as Omit<IAssetForm, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                    object_type_uuid: type.uuid
                },
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            const formFieldOverrideConfigs: {
                config: JSON,
                weight: number
            }[] = (Array.isArray(formValues.field_override_configs) ? formValues.field_override_configs : []) as {
                config: JSON,
                weight: number
            }[];

            await Promise.all(formFieldOverrideConfigs.map(async (overrideConfig) => {
                const schemaForVersion = schemasByVersion[+formValues.object_schema_version!]
                if (schemaForVersion !== undefined && overrideConfig.config !== null && overrideConfig.weight !== undefined && JSON.stringify(overrideConfig.config) !== ***REMOVED******REMOVED***) {
                    const formFieldOverrideConfig = await postFieldsOverrideConfig({
                        fields_override_config: {
                            config: overrideConfig.config,
                            object_schema_uuid: schemaForVersion.uuid,
                            object_schema_version: schemaForVersion.version
                        },
                        token: auth.user?.access_token ?? ***REMOVED******REMOVED***
                    })
                    await postFormToFieldsConfig({
                        formToFieldsConfig: {
                            form_uuid: newForm.uuid,
                            fields_override_config_uuid: formFieldOverrideConfig.uuid,
                            weight: +overrideConfig.weight
                        } as unknown as Omit<IFormToFieldConfig, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
                        token: auth.user?.access_token ?? ***REMOVED******REMOVED***
                    })
                }

            }))

            setSaving(false);
            navigate(***REMOVED***/forms***REMOVED***)
        } catch (e: unknown) {
            setSaving(false);
            setErrors([{ field: ***REMOVED***form***REMOVED***, message: (e as Error).message ?? ***REMOVED***An error occurred while saving the form.***REMOVED*** }]);
            window.scrollTo({
                top: 0,
                behavior: ***REMOVED***smooth***REMOVED*** // Adds a gradual animation
            })
        }
    }



    const formWithoutSlug: IForm = {
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
                id: ***REMOVED***description***REMOVED***,
                label: ***REMOVED***Description***REMOVED***,
                type: ***REMOVED***long_text***REMOVED***,
            },
            {
                id: ***REMOVED***object_schema_version***REMOVED***,
                label: ***REMOVED***Object schema version***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                options: schemas.map(schema => ({ label: `${schema.version.toString()}${schema.is_type_default ? ***REMOVED*** (default)***REMOVED*** : ***REMOVED******REMOVED***}`, value: schema.version })),
                required: true
            },
            {
                id: ***REMOVED***is_type_default***REMOVED***,
                label: ***REMOVED***Is default form for selected type and version?***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            },
            {
                id: ***REMOVED***form_config***REMOVED***,
                label: ***REMOVED***Form configuration (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
                required: true
            },
            {
                id: ***REMOVED***field_override_configs***REMOVED***,
                type: ***REMOVED***object***REMOVED***,
                multiple: true,
                fields: [
                    {
                        id: ***REMOVED***weight***REMOVED***,
                        label: ***REMOVED***Weight***REMOVED***,
                        type: ***REMOVED***number***REMOVED***,
                        defaultValue: 0
                    },
                    {
                        id: ***REMOVED***config***REMOVED***,
                        label: ***REMOVED***Field override configurations (JSON)***REMOVED***,
                        description: `Provide an array of field override configs. Each config should include the id (as \`prop\`) of the field to override and the config to override with. **Example:** 
                        \`[{"prop": "field_to_override", "type":"radio", "options": [{"label": "Option 1", "value": "option_1"}, {"label": "Option 2", "value": "option_2"}]}]\``,
                        type: ***REMOVED***json***REMOVED***
                    }
                ]
            }
        ]
    }

    const { form, formState: [formValues, setFormValue], filterForSave } = useSlug(
        formWithoutSlug,
        {
            object_schema_version: schemas.find(s => s.is_type_default)?.version.toString() ?? schemas.sort((a, b) => b.version - a.version)[0]?.version.toString() ?? ***REMOVED******REMOVED***,
        },
        [***REMOVED***field_override_configs***REMOVED***]
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
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Create form</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValue]} />
            <div className=***REMOVED***flex flex-row sticky bottom-0 py-4 bg-white/80***REMOVED***>
                <Button onClick={onSave} type=***REMOVED***primary***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
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