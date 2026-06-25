import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { patchDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import { type IValidationError, type IObjectSchema } from ***REMOVED***@/types/types***REMOVED***
import type { IAssetForm, IDocument, IFormToFieldConfigWithDetails } from ***REMOVED***@/types/types***REMOVED***
import {
  FormCreator,
  schemaToFormUtils,
  type IForm,
  type IFormFieldOverride,
  type IFormOverride,
  type IFormValues,
} from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***
import { removeUndefinedAndNullKeys, validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import { documentQueryKey, useDocument } from ***REMOVED***./useDocument***REMOVED***
import { useFormAndSchemaAtObjectType } from ***REMOVED***@/manage/form/useForm***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import FileUpload from ***REMOVED***@/manage/custom_inputs/file_upload***REMOVED***
import StationSearch from ***REMOVED***@/manage/custom_inputs/station_search***REMOVED***
import SampleFileObject from ***REMOVED***../custom_inputs/sample_file_object***REMOVED***
import CSVUploadForSampleFile from ***REMOVED***../custom_inputs/csv_upload_for_sample_file***REMOVED***

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
  const queryClient = useQueryClient()
  const defaultForm: IForm = {
    id: ***REMOVED***create-document***REMOVED***,
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
        required: true,
      },
      {
        id: ***REMOVED***data***REMOVED***,
        label: ***REMOVED***Data***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
      },
    ],
  }
  //const dataForm = omit(schemaToFormUtils.schemaToFormObject(schema.json_schema), ***REMOVED***label***REMOVED***)
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
          ***REMOVED***label***REMOVED***
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
    ...(useDataForm ? document.data as JSON : document),
  } as unknown as IFormValues)

  const onSave = async () => {
    setSaving(true)
    const valid = await validate({ form, formValues })
    if (!valid.valid && valid.errors.length > 0) {
      setErrors(valid.errors)
      setSaving(false)
      window.scrollTo({
        top: 0,
        behavior: ***REMOVED***smooth***REMOVED***, // Adds a gradual animation
      })
      queryClient.invalidateQueries({
        queryKey: documentQueryKey({ uuid: document.uuid }),
      })
      return
    }
    setErrors([])
    try {
      const cleanValues = removeUndefinedAndNullKeys(formValues)
      const mergedData = {
        ...document.data as JSON,
        ...(useDataForm ? cleanValues : cleanValues.data as JSON),
      }
      const mergedDocument = {
        ...document,
        ...{
          label:
            formValues.label ??
            formValues.title ??
            formValues.platform_name ??
            formValues.station_label ??
            ***REMOVED***Untitled Document***REMOVED***,
          description: formValues.description ?? ***REMOVED******REMOVED***,
          data: mergedData,
        },
      } as IDocument
      await patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })

      setSaving(false)
      navigate(***REMOVED***/document***REMOVED***)
    } catch (e: unknown) {
      setSaving(false)
      setErrors([
        {
          field: ***REMOVED***form***REMOVED***,
          message: (e as Error)?.message ?? ***REMOVED***An error occurred while saving. Please try again.***REMOVED***,
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: ***REMOVED***smooth***REMOVED***, // Adds a gradual animation
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
          ***REMOVED***custom:file_upload***REMOVED***: FileUpload,
          ***REMOVED***custom:sample_file_object***REMOVED***: SampleFileObject,
          ***REMOVED***custom:csv_upload_for_sample_file***REMOVED***: CSVUploadForSampleFile,
          ***REMOVED***custom:station_search***REMOVED***: StationSearch,
        }}
      />
      <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
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
