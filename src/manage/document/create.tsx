import { useAuth } from '@/auth/useAuth'
import { postDocument } from '@/manage/document/services'
import { type IValidationError, type IObjectSchema, type IObjectType } from '@/types/types'
import type { IAssetForm, IDocument, IFormToFieldConfigWithDetails } from '@/types/types'
import {
  FormCreator,
  schemaToFormUtils,
  type IForm,
  type IFormFieldOverride,
  type IFormOverride,
  type IFormValues,
} from '@axdspub/axiom-ui-forms'
import { Button, Loader, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { omit } from 'lodash-es'
import { validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import Link from '@/manage/components/link'
import { useObjectTypesAndFormsAndSchemas } from '../object_type/useObjectTypeList'
import { useObjectSchemaAndType, useObjectSchemaFull } from '../object_schema/useObjectSchema'
import { useFullForm } from '../form/useForm'
import FileUpload from '../custom_inputs/file_upload'

const CreateDocumentForm = ({
  type,
  assetForm,
  fieldConfigs,
  schema,
}: {
  type: IObjectType
  assetForm?: IAssetForm
  fieldConfigs?: IFormToFieldConfigWithDetails[]
  schema: IObjectSchema
}): ReactElement => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [formValues, setFormValues] = useState<IFormValues>({})
  const [errors, setErrors] = useState<IValidationError[]>([])
  const auth = useAuth()
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
      return
    }
    setErrors([])
    try {
      await postDocument({
        document: {
          object_type_uuid: type.uuid,
          label: formValues.label ?? formValues.title ?? 'Untitled Document',
          data: formValues,
        } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>,
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
    <div className="flex flex-col gap-4">
      <h4 className="text-sm text-gray-500">
        Object type:{' '}
        <Link to={`/object_type/edit/${type.uuid}`} className="font-semibold">
          {type.label}
        </Link>
        , schema:{' '}
        <Link to={`/form/edit/${schema.uuid}`} className="font-semibold">
          {schema.label}
        </Link>
        {assetForm && (
          <>
            <>, </>Asset form:{' '}
            <Link to={`/forms/edit/${assetForm.uuid}`} className="font-semibold">
              {assetForm.label}
            </Link>
          </>
        )}
      </h4>
      <h1 className="text-2xl font-bold">Create new document</h1>
      <Errors errors={errors} />
      <FormCreator
        form={{
          ...form,
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
      <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export const CreateDocumentFromObjectType = (): ReactElement => {
  const params = useParams()
  const object_type_uuid = params.object_type_uuid as string
  const { data, isLoading, error } = useObjectSchemaAndType({ object_type_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && <CreateDocumentForm schema={omit(data, 'object_type')} type={data.object_type} />}
    </ViewWithLoader>
  )
}

export const CreateDocumentFromSchema = (): ReactElement => {
  const params = useParams()
  const object_schema_uuid = params.object_schema_uuid as string
  const { data, isLoading, error } = useObjectSchemaFull({ uuid: object_schema_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <CreateDocumentForm
          schema={data.object_schema}
          type={
            data.object_types.find((ot) => ot.uuid === data.object_schema.object_type_uuid) ??
            data.object_types[0]
          }
        />
      )}
    </ViewWithLoader>
  )
}

export const CreateDocumentFromForm = (): ReactElement => {
  const params = useParams()
  const form_uuid = params.form_uuid as string
  const { data, isLoading, error } = useFullForm({ form_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <CreateDocumentForm
          schema={omit(data.object_schema, 'object_type')}
          type={data.object_schema.object_type}
          assetForm={data.form}
          fieldConfigs={data.field_configs}
        />
      )}
    </ViewWithLoader>
  )
}

export const SelectDocumentForm = (): ReactElement => {
  const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas()
  return (
    <>
      <h2 className="text-2xl font-bold">Create new document</h2>

      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        <>
          {data &&
            data.object_types
              .filter((d) => d.category === 'document')
              .map((type) => {
                const schema = data.schemas.find((s) => s.object_type_uuid === type.uuid)
                if (!schema) {
                  return (
                    <div key={type.uuid} className="p-4 border rounded">
                      <h4 className="font-bold">{type.label}</h4>
                      <div className="">
                        <p>No schema found for this object type. Please create a schema first.</p>
                        <div className="mt-4">
                          <Link
                            to={`/form/create/${type.uuid}/object_type`}
                            className={utils.createButtonClass({
                              size: 'md',
                              variant: 'primary',
                            })}
                          >
                            Create schema
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                }
                const forms = data.forms.filter((f) => f.object_type_uuid === type.uuid)
                const defaultSchema =
                  data.schemas.find((s) => s.object_type_uuid === type.uuid && s.is_type_default) ??
                  data.schemas
                    .filter((s) => s.object_type_uuid === type.uuid)
                    .sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0]
                return (
                  <div key={type.uuid} className="p-4 border rounded">
                    <h4 className="font-bold text-lg">{type.label}</h4>
                    <div className="p-4 flex flex-col gap-2">
                      <p>Create a document:</p>
                      <div className="flex flex-col gap-2 p-2">
                        <p>
                          <Link to={`/document/create/${defaultSchema.uuid}/object_schema`}>
                            Schema only
                          </Link>
                        </p>
                        {forms.map((form) => {
                          return (
                            <Link
                              key={form.uuid}
                              to={`/document/create/${type.uuid}/object_type/${form.uuid}/form`}
                            >
                              Form: {form.label} (schema version: {form.object_schema_version})
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
        </>
      </ViewWithLoader>
    </>
  )
}
