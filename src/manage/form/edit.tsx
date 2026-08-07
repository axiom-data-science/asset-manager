import { Button, Loader, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchForm } from ***REMOVED***@/manage/form/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import {
  type IValidationError,
  type IAssetForm,
  type IFormToFieldConfigWithDetails,
  type IObjectSchema,
} from ***REMOVED***@/types/types***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***
import { formQueryKey, useFullForm } from ***REMOVED***@/manage/form/useForm***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { removeUndefinedAndNullKeys, validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***../components/errors***REMOVED***
import { CopyFields } from ***REMOVED***../components/copy_field***REMOVED***
import { formListQueryKey } from ***REMOVED***./useFormList***REMOVED***
import { Cog, Network, Plus } from ***REMOVED***lucide-react***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***

const EditForm = ({
  assetForm,
  fieldConfigs,
  objectSchema,
}: {
  assetForm: IAssetForm
  fieldConfigs: IFormToFieldConfigWithDetails[]
  objectSchema: IObjectSchema
}): ReactElement => {
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [formValues, setFormValue] = useState<IFormValues>(assetForm as unknown as IFormValues)
  const [errors, setErrors] = useState<IValidationError[]>([])
  const auth = useAuth()
  const navigate = useNavigate()

  const onUpdate = async () => {
    setSaving(true)
    const valid = await validate({ formValues, form })
    if (!valid.valid) {
      setSaving(false)
      setErrors(valid.errors ?? [{ field: ***REMOVED***form***REMOVED***, message: ***REMOVED***Validation failed***REMOVED*** }])
      return
    }
    try {
      await patchForm({
        uuid: assetForm.uuid,
        form: {
          ...assetForm,
          ...(removeUndefinedAndNullKeys(formValues) as unknown as IAssetForm),
        },
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: formQueryKey(assetForm.uuid) })
      queryClient.invalidateQueries({ queryKey: formListQueryKey() })
      navigate(***REMOVED***/forms***REMOVED***)
    } catch (e) {
      setSaving(false)
      setErrors([
        {
          field: ***REMOVED***form***REMOVED***,
          message: `An error occurred while updating the form. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ***REMOVED******REMOVED***}`,
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: ***REMOVED***smooth***REMOVED***,
      })
    }
  }

  const form: IForm = {
    id: ***REMOVED***edit-object-type***REMOVED***,
    settings: {
      show_progress: false,
    },
    fields: [
      {
        id: ***REMOVED***label***REMOVED***,
        label: ***REMOVED***Label***REMOVED***,
        type: ***REMOVED***text***REMOVED***,
        required: true,
      },
      {
        id: ***REMOVED***description***REMOVED***,
        label: ***REMOVED***Description***REMOVED***,
        type: ***REMOVED***long_text***REMOVED***,
      },
      {
        id: ***REMOVED***is_schema_and_version_default***REMOVED***,
        label: ***REMOVED***Is default for object type and schema version?***REMOVED***,
        type: ***REMOVED***boolean***REMOVED***,
        description:
          ***REMOVED***If true, this form will be the default form for the selected object schema version. If false, it will not be the default form, but can still be selected when creating or editing an object.***REMOVED***,
      },
      {
        id: ***REMOVED***use_form_config***REMOVED***,
        label: ***REMOVED***Use form config rather than overriding schema***REMOVED***,
        type: ***REMOVED***boolean***REMOVED***,
        description:
          ***REMOVED***If true, the form will use the provided form configuration rather than generating a form based on the object schema. This allows for more customization, but requires you to provide a complete form configuration.***REMOVED***,
      },
      {
        id: ***REMOVED***form_config***REMOVED***,
        label: ***REMOVED***Form configuration (JSON)***REMOVED***,
        description:
          ***REMOVED***Provide a complete form configuration. The schema will not be used at all to generate the form, so this allows for maximum customization. However, you must provide a complete form configuration with all necessary fields.***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
        conditions: {
          field: ***REMOVED***use_form_config***REMOVED***,
          value: false,
          result: ***REMOVED***disable***REMOVED***,
        },
      },

      {
        id: ***REMOVED***schema_override_config***REMOVED***,
        label: ***REMOVED***Schema override form configuration (JSON)***REMOVED***,
        description:
          ***REMOVED***Provide a form configuration to override the default form configuration generated from the object schema. There are some limitations. For instance, nested objects can not be customized.***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
        conditions: {
          field: ***REMOVED***use_form_config***REMOVED***,
          value: true,
          result: ***REMOVED***disable***REMOVED***,
        },
      },
      {
        id: ***REMOVED***field_override_configs***REMOVED***,
        label: ***REMOVED***Schema field override configurations (JSON)***REMOVED***,
        type: ***REMOVED***object***REMOVED***,
        multiple: true,
        fields: [
          {
            id: ***REMOVED***label***REMOVED***,
            label: ***REMOVED***Label***REMOVED***,
            type: ***REMOVED***text***REMOVED***,
            required: true,
          },
          {
            id: ***REMOVED***weight***REMOVED***,
            label: ***REMOVED***Weight***REMOVED***,
            type: ***REMOVED***number***REMOVED***,
            defaultValue: 0,
          },
          {
            id: ***REMOVED***config***REMOVED***,
            label: ***REMOVED***Field override configurations (JSON)***REMOVED***,
            description: `Provide an array of field override configs. Each config should include the id (as \`prop\`) of the field to override and the config to override with. **Example:** 
                        \`[{"prop": "field_to_override", "type":"radio", "options": [{"label": "Option 1", "value": "option_1"}, {"label": "Option 2", "value": "option_2"}]}]\``,
            type: ***REMOVED***json***REMOVED***,
          },
        ],
      },
    ],
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Edit form</h1>
      <Errors errors={errors} />
      <CopyFields
        fields={[
          { id: ***REMOVED***slug***REMOVED***, label: ***REMOVED***Slug***REMOVED***, value: assetForm.slug },
          { id: ***REMOVED***uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: assetForm.uuid },
          { id: ***REMOVED***object_type_uuid***REMOVED***, label: ***REMOVED***Object type UUID***REMOVED***, value: assetForm.object_type_uuid },
          {
            id: ***REMOVED***object_schema_version***REMOVED***,
            label: ***REMOVED***Object schema version***REMOVED***,
            value: assetForm.object_schema_version,
          },
        ]}
      />

      <FormCreator form={form} formValueState={[formValues, setFormValue]} className="-mt-8" />
      <div className="flex flex-col gap-8 bg-slate-100 p-4 rounded-md">
        <div className="flex flex-col gap-2">
          <h4 className="flex flex-row gap-2 items-center">
            <Network size={14} /> Associated Schema
          </h4>
          <div className="p-4 bg-slate-200 rounded-md">
            <p className="font-semibold">
              <Link to={`/object_schema/edit/${objectSchema.uuid}`}>{objectSchema.label}</Link>
            </p>
            <CopyFields
              fields={[
                { id: `uuid-${objectSchema.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: objectSchema.uuid },
                {
                  id: `object_type_uuid-${objectSchema.uuid}`,
                  label: ***REMOVED***Object type***REMOVED***,
                  value: objectSchema.object_type_uuid,
                },
                {
                  id: `version-${objectSchema.uuid}`,
                  label: ***REMOVED***Version***REMOVED***,
                  value: objectSchema.version,
                },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="flex flex-row gap-2 items-center">
            <Cog size={14} /> Associated Field Overrides
            {fieldConfigs.length > 0 && (
              <Link
                to={`/field_configs/create?form_uuid=${assetForm.uuid}`}
                className={utils.createButtonClass({
                  size: ***REMOVED***xs***REMOVED***,
                  type: ***REMOVED***create***REMOVED***,
                  className: ***REMOVED***ml-2 gap-1***REMOVED***,
                })}
              >
                <Plus /> Create field override for{***REMOVED*** ***REMOVED***}
                <strong className="underline underline-offset-2 decoration-dotted">
                  {assetForm.label}
                </strong>{***REMOVED*** ***REMOVED***}
                form
              </Link>
            )}
          </h4>
          <div className="p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md">
            {fieldConfigs.length < 1 && (
              <div className="flex flex-col gap-4">
                <p>No field override configs found for this form.</p>
                <div>
                  <Link
                    to={`/field_configs/create?form_uuid=${assetForm.uuid}`}
                    className={utils.createButtonClass({
                      size: ***REMOVED***md***REMOVED***,
                      variant: ***REMOVED***primary***REMOVED***,
                    })}
                  >
                    Create field override config
                  </Link>
                </div>
              </div>
            )}
            {fieldConfigs.map((fieldConfig) => {
              return (
                <div key={fieldConfig.uuid} className="p-4 bg-white rounded-md flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <h2 className="font-semibold">{fieldConfig.fields_override_config.label}</h2>
                    <CopyFields
                      fields={[
                        { id: `uuid-${fieldConfig.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: fieldConfig.uuid },
                        {
                          id: `object_schema_uuid-${fieldConfig.uuid}`,
                          label: ***REMOVED***Object schema UUID***REMOVED***,
                          value: fieldConfig.fields_override_config.object_schema_uuid,
                        },
                      ]}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
        <Button onClick={onUpdate} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}
        </Button>
      </div>
    </div>
  )
}

const EditFormLoader = (): ReactElement => {
  const params = useParams()
  const uuid = params.uuid
  const { data, isLoading, error } = useFullForm({ form_uuid: uuid ?? ***REMOVED******REMOVED*** })
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <EditForm
          assetForm={data.form}
          fieldConfigs={data.field_configs}
          objectSchema={data.object_schema}
        />
      )}
    </ViewWithLoader>
  )
}

export default EditFormLoader
