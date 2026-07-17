import { Button, Loader, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { FormCreator, type IFormValues, type IForm } from '@axdspub/axiom-ui-forms'
import { patchForm } from '@/manage/form/services'
import { useAuth } from '@/auth/useAuth'
import {
  type IValidationError,
  type IAssetForm,
  type IFormToFieldConfigWithDetails,
  type IObjectSchema,
} from '@/types/types'
import { useNavigate, useParams } from 'react-router-dom'
import { formQueryKey, useFullForm } from '@/manage/form/useForm'
import { useQueryClient } from '@tanstack/react-query'
import { removeUndefinedAndNullKeys, validate } from '@/lib/utils'
import Errors from '../components/errors'
import { CopyFields } from '../components/copy_field'
import { formListQueryKey } from './useFormList'
import { Cog, Network, Plus } from 'lucide-react'
import Link from '@/manage/components/link'

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
    if (!valid.errors) {
      setSaving(false)
      setErrors(valid.errors)
      return
    }
    try {
      await patchForm({
        uuid: assetForm.uuid,
        form: {
          ...assetForm,
          ...(removeUndefinedAndNullKeys(formValues) as unknown as IAssetForm),
        },
        token: auth.user?.access_token ?? '',
      })
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: formQueryKey(assetForm.uuid) })
      queryClient.invalidateQueries({ queryKey: formListQueryKey() })
      navigate('/forms')
    } catch (e) {
      setSaving(false)
      setErrors([
        {
          field: 'form',
          message: `An error occurred while updating the form. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ''}`,
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }

  const form: IForm = {
    id: 'edit-object-type',
    settings: {
      show_progress: false,
    },
    fields: [
      {
        id: 'label',
        label: 'Label',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'long_text',
      },
      {
        id: 'is_schema_and_version_default',
        label: 'Is default for object type and schema version?',
        type: 'boolean',
        description:
          'If true, this form will be the default form for the selected object schema version. If false, it will not be the default form, but can still be selected when creating or editing an object.',
      },
      {
        id: 'use_form_config',
        label: 'Use form config rather than overriding schema',
        type: 'boolean',
        description:
          'If true, the form will use the provided form configuration rather than generating a form based on the object schema. This allows for more customization, but requires you to provide a complete form configuration.',
      },
      {
        id: 'form_config',
        label: 'Form configuration (JSON)',
        description:
          'Provide a complete form configuration. The schema will not be used at all to generate the form, so this allows for maximum customization. However, you must provide a complete form configuration with all necessary fields.',
        type: 'json',
        conditions: {
          field: 'use_form_config',
          value: false,
          result: 'disable',
        },
      },

      {
        id: 'schema_override_config',
        label: 'Schema override form configuration (JSON)',
        description:
          'Provide a form configuration to override the default form configuration generated from the object schema. There are some limitations. For instance, nested objects can not be customized.',
        type: 'json',
        conditions: {
          field: 'use_form_config',
          value: true,
          result: 'disable',
        },
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
            required: true,
          },
          {
            id: 'weight',
            label: 'Weight',
            type: 'number',
            defaultValue: 0,
          },
          {
            id: 'config',
            label: 'Field override configurations (JSON)',
            description: `Provide an array of field override configs. Each config should include the id (as \`prop\`) of the field to override and the config to override with. **Example:** 
                        \`[{"prop": "field_to_override", "type":"radio", "options": [{"label": "Option 1", "value": "option_1"}, {"label": "Option 2", "value": "option_2"}]}]\``,
            type: 'json',
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
          { id: 'slug', label: 'Slug', value: assetForm.slug },
          { id: 'uuid', label: 'UUID', value: assetForm.uuid },
          { id: 'object_type_uuid', label: 'Object type UUID', value: assetForm.object_type_uuid },
          {
            id: 'object_schema_version',
            label: 'Object schema version',
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
                { id: `uuid-${objectSchema.uuid}`, label: 'UUID', value: objectSchema.uuid },
                {
                  id: `object_type_uuid-${objectSchema.uuid}`,
                  label: 'Object type',
                  value: objectSchema.object_type_uuid,
                },
                {
                  id: `version-${objectSchema.uuid}`,
                  label: 'Version',
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
                  size: 'xs',
                  type: 'create',
                  className: 'ml-2 gap-1',
                })}
              >
                <Plus /> Create field override for{' '}
                <strong className="underline underline-offset-2 decoration-dotted">
                  {assetForm.label}
                </strong>{' '}
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
                      size: 'md',
                      variant: 'primary',
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
                        { id: `uuid-${fieldConfig.uuid}`, label: 'UUID', value: fieldConfig.uuid },
                        {
                          id: `object_schema_uuid-${fieldConfig.uuid}`,
                          label: 'Object schema UUID',
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
          {saving ? <Loader className="animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  )
}

const EditFormLoader = (): ReactElement => {
  const params = useParams()
  const uuid = params.uuid
  const { data, isLoading, error } = useFullForm({ form_uuid: uuid ?? '' })
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
