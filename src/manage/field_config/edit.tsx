import { useAuth } from '@/auth/useAuth'
import { useFieldConfig, useFieldConfigFormLinks } from '@/manage/field_config/useFieldConfig'
import { patchFieldConfig } from '@/manage/field_config/services'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import type { IFieldOverrideConfig, IValidationError } from '@/types/types'
import { useEffect, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import Link from '@/manage/components/link'
import { fieldConfigListQueryKey } from './useFieldConfigList'

const EditFieldConfigForm = ({ fieldConfig, uuid }: { fieldConfig: IFieldOverrideConfig; uuid: string }): ReactElement => {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: formLinks } = useFieldConfigFormLinks({ uuid })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<IValidationError[]>([])
  const [formValues, setFormValues] = useState<IFormValues>(fieldConfig as unknown as IFormValues)

  useEffect(() => {
    setFormValues(fieldConfig as unknown as IFormValues)
  }, [fieldConfig])

  const form: IForm = {
    id: 'edit-field-config',
    settings: { show_progress: false },
    fields: [
      { id: 'label', label: 'Label', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'long_text' },
      {
        id: 'config',
        label: 'Field override configuration (JSON)',
        description: 'Provide the JSON configuration for the selected form fields.',
        type: 'json',
        required: true,
      },
    ],
  }

  const onUpdate = async (): Promise<void> => {
    const validation = await validate({ form, formValues })
    if (!validation.valid) {
      setErrors(validation.errors ?? [{ field: 'form', message: 'Validation failed.' }])
      return
    }

    setSaving(true)
    setErrors([])
    try {
      await patchFieldConfig({
        uuid,
        fields_override_config: {
          ...fieldConfig,
          label: String(formValues.label),
          description: formValues.description ? String(formValues.description) : undefined,
          config: (formValues.config ?? []) as unknown as IFieldOverrideConfig['config'],
        },
        token: auth.user?.access_token ?? '',
      })
      await queryClient.invalidateQueries({ queryKey: ['field_config', uuid] })
      await queryClient.invalidateQueries({ queryKey: fieldConfigListQueryKey({}) })
      navigate('/field_configs')
    } catch (error) {
      setErrors([{
        field: 'form',
        message: `An error occurred while updating the field config.${error instanceof Error ? ` ${error.message}` : ''}`,
      }])
    } finally {
      setSaving(false)
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="p-20">
        <p>You must be logged in to edit a field config.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Edit field config</h1>
      <Errors errors={errors} />
      <FormCreator form={form} formValueState={[formValues, setFormValues]} />
      <section className="flex flex-col gap-2 rounded-md bg-slate-100 p-4">
        <h2 className="font-semibold">Associated forms</h2>
        {formLinks?.length ? formLinks.map((link) => (
          <Link key={link.uuid} to={`/forms/edit/${link.form.uuid}`}>{link.form.label}</Link>
        )) : <p>This field config is not associated with a form.</p>}
      </section>
      <div className="flex flex-row sticky bottom-0 py-4 bg-white/80 justify-end">
        <Button onClick={() => void onUpdate()} type="default" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  )
}

const EditFieldConfig = (): ReactElement => {
  const { uuid } = useParams()
  const { data: fieldConfig, isLoading, error } = useFieldConfig({ uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={fieldConfig}>
      {fieldConfig && uuid && <EditFieldConfigForm fieldConfig={fieldConfig} uuid={uuid} />}
    </ViewWithLoader>
  )
}

export default EditFieldConfig