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
import { useEffect, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { omit } from 'lodash-es'
import { cn, removeUndefinedAndNullKeys, validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { useClearDocumentQueryCache, useDocument } from './useDocument'
import { useFormAndSchemaAtObjectType } from '@/manage/form/useForm'
import FileUpload from '@/manage/custom_inputs/file_upload'
import StationSearch from '@/manage/custom_inputs/station_search'
import SampleFileObject from '../custom_inputs/sample_file_object'
import CSVUploadForSampleFile from '../custom_inputs/csv_upload_for_sample_file'
import { lockDocument, unlockDocument } from '@/services/postgrest/services'
import { Lock, Unlock } from 'lucide-react'

const DocumentLockStatus = ({
  document,
  className,
}: {
  document: IDocument
  className?: string
}): ReactElement => {
  const auth = useAuth()
  const [locked, setLocked] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const updateLockStatus = async (lock: boolean) => {
    setIsUpdating(true)
    let worked = false
    try {
      if (lock) {
        worked = await lockDocument({
          document_uuid: document.uuid,
          user_sub: auth?.user?.profile?.sub ?? '',
          token: auth?.user?.access_token ?? '',
        })
        if (worked) {
          setLocked(true)
        }
      } else {
        worked = await unlockDocument({
          document_uuid: document.uuid,
          user_sub: auth?.user?.profile?.sub ?? '',
          token: auth?.user?.access_token ?? '',
        })
        if (worked) {
          setLocked(false)
        }
      }
    } catch (error) {
      console.error('Error updating lock status:', error)
    }
    setIsUpdating(false)
    useClearDocumentQueryCache(document.uuid)
    return worked
  }

  const lock = async () => {
    updateLockStatus(true)
  }
  const unlock = async () => {
    updateLockStatus(false)
  }

  useEffect(() => {
    lock()
    return () => {
      unlock()
    }
  })

  if (auth === undefined) {
    return <>!</>
  }

  return (
    <span
      className={cn(
        'w-8 h-8 flex flex-row items-center justify-center rounded-sm shadow-md bg-slate-200',
        className
      )}
    >
      {isUpdating ? (
        <Loader size="sm" />
      ) : locked ? (
        <Lock className="w-4 h-4 text-slate-800" />
      ) : (
        <Unlock className="w-4 h-4 text-red-800" />
      )}
    </span>
  )
}

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

  const useDataForm =
    dataForm.fields?.length ||
    dataForm.pages?.length ||
    dataForm.wizard_steps?.length ||
    dataForm.tabs?.length

  const form = useDataForm ? dataForm : defaultForm

  const [formValues, setFormValues] = useState<IFormValues>({
    ...(useDataForm ? (document.data as JSON) : document),
  } as unknown as IFormValues)

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
      useClearDocumentQueryCache(document.uuid)
      return
    }
    setErrors([])
    try {
      const cleanValues = removeUndefinedAndNullKeys(formValues)
      const mergedData = {
        ...(document.data as JSON),
        ...(useDataForm ? cleanValues : (cleanValues.data as JSON)),
      }
      const mergedDocument = {
        ...document,
        ...{
          label:
            formValues.label ??
            formValues.title ??
            formValues.platform_name ??
            formValues.station_label ??
            'Untitled Document',
          description: formValues.description ?? '',
          data: mergedData,
        },
      } as IDocument
      await patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
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
      <h1 className="text-2xl font-bold flex flex-row justify-between items-center">
        <span>Edit document</span>
        <DocumentLockStatus document={document} />
      </h1>
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
          'custom:sample_file_object': SampleFileObject,
          'custom:csv_upload_for_sample_file': CSVUploadForSampleFile,
          'custom:station_search': StationSearch,
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
  const { data, isLoading, error } = useFormAndSchemaAtObjectType({
    object_type_uuid: document.object_type_uuid,
  })
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <EditDocumentForm
          document={document}
          schema={data.object_schema}
          assetForm={data.forms.find((f) => f.is_schema_and_version_default) ?? data.forms[0]}
        />
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
