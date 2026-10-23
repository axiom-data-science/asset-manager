import { useAuth } from '@/auth/useAuth'
import Errors from '@/manage/components/errors'
import Link from '@/manage/components/link'
import { postFieldConfig, postFormToFieldsConfig } from '@/manage/field_config/services'
import { useFormList } from '@/manage/form/useFormList'
import { useObjectSchemaList } from '@/manage/object_schema/useObjectSchemaList'
import { validate } from '@/lib/utils'
import type { IAssetForm, IFieldOverrideConfig, IFormToFieldConfig, IObjectSchema, IValidationError } from '@/types/types'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const CreateFieldConfigForm = ({
  forms,
  schemas,
  formUuid,
}: {
  forms: IAssetForm[]
  schemas: IObjectSchema[]
  formUuid?: string
}): ReactElement => {
  const auth = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<IValidationError[]>([])
  const [formValues, setFormValues] = useState<IFormValues>({
    form_uuid: formUuid ?? '',
    config: [],
    weight: 0,
  })

  const form: IForm = {
    id: 'create-field-config',
    settings: { show_progress: false },
    fields: [
      {
        id: 'form_uuid',
        label: 'Form',
        type: 'select',
        options: forms.map((assetForm) => ({
          label: assetForm.label,
          value: assetForm.uuid,
        })),
        required: true,
      },
      { id: 'label', label: 'Label', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'long_text' },
      {
        id: 'weight',
        label: 'Weight',
        type: 'number',
        defaultValue: 0,
        required: true,
      },
      {
        id: 'config',
        label: 'Field override configuration (JSON)',
        description: 'Provide the JSON configuration for the selected form fields.',
        type: 'json',
        required: true,
      },
    ],
  }

  const onSave = async (): Promise<void> => {
    const validation = await validate({ form, formValues })
    if (!validation.valid) {
      setErrors(validation.errors ?? [{ field: 'form', message: 'Validation failed.' }])
      return
    }

    const selectedForm = forms.find((assetForm) => assetForm.uuid === formValues.form_uuid)
    const schema = selectedForm && schemas.find(
      (candidate) =>
        candidate.object_type_uuid === selectedForm.object_type_uuid &&
        candidate.version === selectedForm.object_schema_version
    )
    if (!selectedForm || !schema) {
      setErrors([{
        field: 'form_uuid',
        message: 'Select a form with an associated object schema before saving.',
      }])
      return
    }

    setSaving(true)
    setErrors([])
    try {
      const fieldConfig = await postFieldConfig({
        fields_override_config: {
          label: String(formValues.label),
          description: formValues.description ? String(formValues.description) : undefined,
          object_schema_uuid: schema.uuid,
          object_schema_version: schema.version,
          config: (formValues.config ?? []) as unknown as IFieldOverrideConfig['config'],
        },
        token: auth.user?.access_token ?? '',
      })
      await postFormToFieldsConfig({
        formToFieldsConfig: {
          form_uuid: selectedForm.uuid,
          fields_override_config_uuid: fieldConfig.uuid,
          weight: Number(formValues.weight ?? 0),
        } satisfies Omit<IFormToFieldConfig, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
        token: auth.user?.access_token ?? '',
      })
      navigate('/field_configs')
    } catch (error) {
      setErrors([{
        field: 'form',
        message: `An error occurred while creating the field config.${error instanceof Error ? ` ${error.message}` : ''}`,
      }])
    } finally {
      setSaving(false)
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="p-20">
        <p>You must be logged in to create a field config.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create field config</h1>
      {formUuid && (
        <p className="text-sm text-gray-500">
          Creating a field config for the selected form. <Link to={`/forms/edit/${formUuid}`}>View form</Link>
        </p>
      )}
      <Errors errors={errors} />
      <FormCreator form={form} formValueState={[formValues, setFormValues]} />
      <div className="flex flex-row sticky bottom-0 py-4 bg-white/80">
        <Button onClick={() => void onSave()} type="default" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

const CreateFieldConfig = (): ReactElement => {
  const { form_uuid: formUuid } = useParams()
  const { data: forms, isLoading: formsLoading, error: formsError } = useFormList()
  const { data: schemas, isLoading: schemasLoading, error: schemasError } = useObjectSchemaList()
  const error = formsError ?? schemasError

  return (
    <ViewWithLoader
      isLoading={formsLoading || schemasLoading}
      error={error}
      data={forms && schemas}
    >
      {forms && schemas && (
        <CreateFieldConfigForm forms={forms} schemas={schemas} formUuid={formUuid} />
      )}
    </ViewWithLoader>
  )
}

export default CreateFieldConfig
