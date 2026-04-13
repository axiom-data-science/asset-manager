import { useAuth } from '@/auth/useAuth'
import { patchDocument } from '@/manage/document/services'
import { type IValidationError, type IObjectSchema } from '@/types/types'
import type { IAssetForm, IDocument, IFormToFieldConfigWithDetails } from '@/types/types'
import {
  FormCreator,
  schemaToFormUtils,
  type IForm,
  type IFormFieldOverride,
  type IFormOverride,
  type IFormValues,
} from '@axdspub/axiom-ui-forms'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { omit } from 'lodash-es'
import { validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { documentQueryKey, useDocument } from './useDocument'
import { useFullDefaultFormAtObjectType } from '../form/useForm'
import { useQueryClient } from '@tanstack/react-query'
import FileUpload from '../custom_inputs/file_upload'

const EditDocumentForm = ({
  document,
  schema,
  assetForm,
  fieldConfigs,
}: {
  document: IDocument
  schema: IObjectSchema
  assetForm?: IAssetForm | null
  fieldConfigs?: IFormToFieldConfigWithDetails[]
}): ReactElement => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [formValues, setFormValues] = useState<IFormValues>(document.data as unknown as IFormValues)
  const [errors, setErrors] = useState<IValidationError[]>([])
  const auth = useAuth()
  const queryClient = useQueryClient()
  const defaultForm: IForm = {
    id: 'create-document',
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
        required: true,
      },
      {
        id: 'data',
        label: 'Data',
        type: 'json',
      },
    ],
  }
  //const dataForm = omit(schemaToFormUtils.schemaToFormObject(schema.json_schema), 'label')
  const fieldConfigJSON =
    fieldConfigs?.map((fc) => fc.fields_override_config.config as unknown as IFormFieldOverride) ??
    []
  const dataForm = (
    assetForm?.use_form_config === true &&
    assetForm?.form_config !== undefined &&
    assetForm?.form_config !== null
      ? assetForm.form_config
      : assetForm?.schema_override_config !== undefined || fieldConfigJSON !== undefined
        ? omit(
            schemaToFormUtils.overridesAndSchemaToFormObject({
              schema: schema.json_schema,
              formOverrides: assetForm?.schema_override_config
                ? [assetForm?.schema_override_config as IFormOverride]
                : undefined,
              formFieldOverrides: fieldConfigJSON ? [fieldConfigJSON] : undefined,
            }),
            'label'
          )
        : schemaToFormUtils.schemaToFormObject(schema.json_schema)
  ) as IForm
  const form =
    dataForm.fields?.length ||
    dataForm.pages?.length ||
    dataForm.wizard_steps?.length ||
    dataForm.tabs?.length
      ? dataForm
      : defaultForm

  const onSave = async () => {
    setSaving(true)
    const valid = await validate({ form, formValues })
    if (!valid.valid && valid.errors.length > 0) {
      setErrors(valid.errors)
      setSaving(false)
      window.scrollTo({
        top: 0,
        behavior: 'smooth', // Adds a gradual animation
      })
      queryClient.invalidateQueries({
        queryKey: documentQueryKey(document.uuid),
      })
      return
    }
    setErrors([])
    try {
      await patchDocument({
        uuid: document.uuid,
        document: {
          uuid: document.uuid,
          label: formValues.label ?? formValues.title ?? 'Untitled Document',
          description: formValues.description ?? '',
          data: formValues,
        } as Omit<IDocument, 'created_at' | 'updated_at'>,
        token: auth.user?.access_token ?? '',
      })

      setSaving(false)
      navigate('/document')
    } catch (e: unknown) {
      setSaving(false)
      setErrors([
        {
          field: 'form',
          message: (e as Error)?.message ?? 'An error occurred while saving. Please try again.',
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: 'smooth', // Adds a gradual animation
      })
    }
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <h1 className="text-2xl font-bold">Edit document</h1>
      <Errors errors={errors} />
      <FormCreator
        form={{
          ...form,
          label: undefined,
          settings: {
            ...form.settings,
            url_navigable: false,
          },
        }}
        formValueState={[formValues, setFormValues]}
        inputOverrides={{
          'custom:file_upload': FileUpload,
        }}
      />
      <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

const LoadSchemaAndCreateDocumentForm = ({ document }: { document: IDocument }): ReactElement => {
  const { data, isLoading, error } = useFullDefaultFormAtObjectType({
    object_type_uuid: document.object_type_uuid,
  })
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <EditDocumentForm document={document} schema={data.object_schema} assetForm={data.form} />
      )}
    </ViewWithLoader>
  )
}

const EditDocument = (): ReactElement => {
  const uuid = useParams().uuid ?? null

  const { data: document, isLoading, error } = useDocument(uuid)
  if (uuid === null || uuid === undefined) {
    return (
      <div className="p-20">
        <p>No document specified. Please select a document to edit.</p>
      </div>
    )
  }
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={document}>
      {document && <LoadSchemaAndCreateDocumentForm document={document as IDocument} />}
    </ViewWithLoader>
  )

  //return <ObjectTypeLoader urlRoot="/document/create" View={LoadSchemaAndCreateDocumentForm} />
}

export default EditDocument
