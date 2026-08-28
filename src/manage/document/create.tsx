import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import contextStateAtom from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { fetchDocument, postDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import { type IValidationError, type IObjectSchema, type IObjectType } from ***REMOVED***@/types/types***REMOVED***
import type {
  IAssetForm,
  IDocument,
  IFormToFieldConfigWithDetails,
  IPostgrestFilter,
  IPredicate,
} from ***REMOVED***@/types/types***REMOVED***
import {
  FormCreator,
  schemaToFormUtils,
  type IForm,
  type IFormFieldOverride,
  type IFormOverride,
} from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Button, Loader, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate, useParams, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import { get, omit } from ***REMOVED***lodash-es***REMOVED***
import { buildStringFromTemplate, getBrand, validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { useObjectTypesAndFormsAndSchemas } from ***REMOVED***@/manage/object_type/useObjectTypeList***REMOVED***
import { useFullForm } from ***REMOVED***@/manage/form/useForm***REMOVED***
import FileUpload from ***REMOVED***@/manage/custom_inputs/file_upload***REMOVED***
import { Book, BookPlus, Check, Network } from ***REMOVED***lucide-react***REMOVED***
import StationSearch from ***REMOVED***../custom_inputs/station_search***REMOVED***
import { useSlug } from ***REMOVED***@/manage/components/useSlug***REMOVED***
import SampleFileObject from ***REMOVED***../custom_inputs/sample_file_object***REMOVED***
import CSVUploadForSampleFile from ***REMOVED***../custom_inputs/csv_upload_for_sample_file***REMOVED***
import { getBrandComponent, type BrandComponentProps } from ***REMOVED***@/BrandComponents***REMOVED***
import { useObjectTypeFull } from ***REMOVED***@/manage/object_type/useObjectType***REMOVED***
import { useObjectSchemaFull } from ***REMOVED***@/manage/object_schema/useObjectSchema***REMOVED***
import DocumentTabs from ***REMOVED***./document_tabs***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { fetchSingleFromPostgrest, postToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import { fetchObjectType } from ***REMOVED***../object_type/services***REMOVED***
import EditDocument from ***REMOVED***./edit***REMOVED***
import StateSelector from ***REMOVED***@/manage/custom_inputs/state_selector***REMOVED***

const CreateDocumentForm = ({
  type,
  assetForm,
  fieldConfigs,
  schema,
  onSuccess,
  returnToOnSuccess,
  parentDocumentUUID,
  toParentPredicate,
  childDocumentUUID,
  toChildPredicate,
}: {
  type: IObjectType
  assetForm?: IAssetForm
  fieldConfigs?: IFormToFieldConfigWithDetails[]
  schema: IObjectSchema,
  parentDocumentUUID?: string,
  toParentPredicate?: string,
  childDocumentUUID?: string,
  toChildPredicate?: string,
  onSuccess?: (document: IDocument) => void
  returnToOnSuccess?: string
}): ReactElement => {
  const navigate = useNavigate()
  const [contextState] = useAtom(contextStateAtom)
  const [saving, setSaving] = useState(false)
  //const [formValues, setFormValues] = useState<IFormValues>({})
  const [errors, setErrors] = useState<IValidationError[]>([])
  const auth = useAuth()
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

  const useDataForm = !!(
    dataForm.fields?.length ||
    dataForm.pages?.length ||
    dataForm.wizard_steps?.length ||
    dataForm.tabs?.length
  )

  const formJSON = useDataForm ? dataForm : defaultForm

  const {
    form,
    formState: [formValues, setFormValues],
    filterForSave
  } = useSlug({
    form: formJSON,
    labelPath: type.data?.field_mappings?.label,
    autoSlug: true
  })

  const onSave = async () => {
    setSaving(true)
    const valuesToSave = filterForSave(formValues)
    const valid = await validate({ form, formValues: valuesToSave, schema: schema.json_schema })
    if (!valid.valid && valid.errors.length > 0) {
      setErrors(valid.errors)
      setSaving(false)
      window.scrollTo({
        top: 0,
        behavior: ***REMOVED***smooth***REMOVED***, // Adds a gradual animation
      })
      return
    }
    setErrors([])
    try {
      const defaultLabel = formValues.label ??
        formValues.title ??
        formValues.platform_name ??
        formValues.station_label ??
        ***REMOVED***Untitled Document***REMOVED***
      const label = type.data?.field_mappings?.label
        ? get(valuesToSave, type.data.field_mappings.label, defaultLabel)
        : defaultLabel


      const slug = formValues.slug ?? null
      const defaultDescription = formValues.description ?? ***REMOVED******REMOVED***
      const description = type.data?.field_mappings?.description
        ? get(valuesToSave, type.data.field_mappings.description, defaultDescription)
        : defaultDescription

      const docToSave = {
        object_type_uuid: type.uuid,
        label,
        description,
        slug,
        data: useDataForm ? valuesToSave : (valuesToSave.data as JSON),
      } as Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
      const newDoc = await postDocument({
        document: docToSave,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })

      if (parentDocumentUUID && toParentPredicate) {
        const predicate = contextState.predicate_by_predicate[toParentPredicate] ?? contextState.predicate_by_uuid[toParentPredicate]
        if (predicate) {
          await postToPostgrest({
            table: ***REMOVED***relationship***REMOVED***,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            body: {
              predicate_uuid: predicate.uuid,
              // The relationship is from the newly created document to the parent document
              from_document_uuid: newDoc.uuid,
              to_document_uuid: parentDocumentUUID
            }
          })
        } else {
          console.warn(`Predicate not found for parent document relationship: ${toParentPredicate}`)
        }
      }
      if (childDocumentUUID && toChildPredicate) {
        const predicateObj = contextState.predicate_by_predicate[toChildPredicate] ?? contextState.predicate_by_uuid[toChildPredicate]
        if (predicateObj) {
          await postToPostgrest({
            table: ***REMOVED***relationship***REMOVED***,
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            body: {
              predicate_uuid: predicateObj.uuid,
              // The relationship is from the child document to the newly created document as it***REMOVED***s parent
              from_document_uuid: childDocumentUUID,
              to_document_uuid: newDoc.uuid
            }
          })
        } else {
          console.warn(`Predicate not found for child document relationship: ${toChildPredicate}`)
        }
      }


      if (onSuccess) {
        onSuccess(newDoc)
      }

      const navPath =
        returnToOnSuccess !== undefined
          ? buildStringFromTemplate(returnToOnSuccess, { ...newDoc, ...{ parentDocumentUUID, toParentPredicate, childDocumentUUID, toChildPredicate }, ...{ object_type: type } })
          : (new URLSearchParams(window.location.search).get(***REMOVED***returnToOnSuccess***REMOVED***) ?? undefined)

      setSaving(false)
      navigate(`${navPath ?? ***REMOVED***/document***REMOVED***}?uuid=${newDoc.uuid}`)
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

  const includeSaveButton = form.wizard_steps !== undefined || form.pages !== undefined

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm text-gray-500 hidden">
        Object type:{***REMOVED*** ***REMOVED***}
        <Link to={`/object_type/edit/${type.uuid}`} className="font-semibold">
          {type.label}
        </Link>
        , schema:{***REMOVED*** ***REMOVED***}
        <Link to={`/form/edit/${schema.uuid}`} className="font-semibold">
          {schema.label}
        </Link>
        {assetForm && (
          <>
            <>, </>Asset form:{***REMOVED*** ***REMOVED***}
            <Link to={`/forms/edit/${assetForm.uuid}`} className="font-semibold">
              {assetForm.label}
            </Link>
          </>
        )}
      </h4>
      <h1 className="text-2xl font-bold">
        {assetForm?.label ?? `Create new ${type.label} document`}
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
          ***REMOVED***custom:file_upload***REMOVED***: FileUpload,
          ***REMOVED***custom:sample_file_object***REMOVED***: SampleFileObject,
          ***REMOVED***custom:csv_upload_for_sample_file***REMOVED***: CSVUploadForSampleFile,
          ***REMOVED***custom:station_search***REMOVED***: StationSearch,
          ***REMOVED***custom:state_selector***REMOVED***: StateSelector
        }}
        SubmitButton={
          includeSaveButton && (
            <Button onClick={onSave} type="primary" disabled={saving}>
              {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
            </Button>
          )
        }
      />
      {!includeSaveButton && (
        <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end">
          <Button onClick={onSave} type="primary" disabled={saving}>
            {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
          </Button>
        </div>
      )}
    </div>
  )
}

export const CreateDocumentFromObjectType = ({
  returnToOnSuccess,
  onSuccess,
  objectTypeUUID,
}: {
  returnToOnSuccess?: string
  onSuccess?: (document: IDocument) => void
  objectTypeUUID?: string
}): ReactElement => {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const object_type_uuid = objectTypeUUID ?? (params.object_type_uuid as string)
  const parentDocumentUUID = searchParams.get(***REMOVED***parentDocumentUUID***REMOVED***) ?? undefined
  const toParentPredicate = searchParams.get(***REMOVED***toParentPredicate***REMOVED***) ?? undefined
  const toChildPredicate = searchParams.get(***REMOVED***toChildPredicate***REMOVED***) ?? undefined
  const { data, isLoading, error } = useObjectTypeFull({ uuid: object_type_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <DocumentTabs
          objectType={data.object_type}
          viewLabel={`${data.object_type.label}`}
          View={
            <CreateDocumentForm
              schema={
                data.schemas.find((s) => s.is_type_default) ??
                data.schemas.sort((a, b) => b.version - a.version)[0]
              }
              type={data.object_type}
              assetForm={
                data.forms.find((f) => f.is_schema_and_version_default) ??
                data.forms.sort((a, b) => b.object_schema_version - a.object_schema_version)[0] ??
                undefined
              }
              parentDocumentUUID={parentDocumentUUID}
              toParentPredicate={toParentPredicate}
              toChildPredicate={toChildPredicate}
              returnToOnSuccess={returnToOnSuccess}
              onSuccess={onSuccess}
            />
          }
        />
      )}
    </ViewWithLoader>
  )
}

export const CreateChildDocumentFromObjectType = ({
  returnToOnSuccess,
}: {
  returnToOnSuccess?: string
}): ReactElement => {
  const { parent_document_uuid, expected_predicate, child_object_type_uuid } = useParams()
  const auth = useAuth()
  const { data, isLoading, error } = useQuery({
    enabled: !!parent_document_uuid && !!expected_predicate && !!child_object_type_uuid,
    queryKey: [***REMOVED***document***REMOVED***, parent_document_uuid, expected_predicate, child_object_type_uuid],
    queryFn: async ({ signal }) => {
      if (!parent_document_uuid || !expected_predicate || !child_object_type_uuid) {
        throw new Error(***REMOVED***Missing required parameters***REMOVED***)
      }
      const parentDocument = await fetchDocument({
        uuid: parent_document_uuid,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        signal,
      })
      const parentObjectType = await fetchObjectType({
        uuid: parentDocument.object_type_uuid,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        signal,
      })
      const expectedPredicate = await fetchSingleFromPostgrest<IPredicate>({
        table: ***REMOVED***predicate***REMOVED***,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        params: {
          filters: [
            {
              column: ***REMOVED***predicate***REMOVED***,
              operator: ***REMOVED***eq***REMOVED***,
              value: expected_predicate,
            },
          ],
        },
      })
      return {
        parentDocument,
        parentObjectType,
        expectedPredicate,
      }
    },
  })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && data.parentDocument && data.expectedPredicate && (
        <DocumentTabs
          objectType={data.parentObjectType}
          viewLabel={`${data.parentObjectType.label}`}
          document={data.parentDocument}
          View={<EditDocument document_uuid={data.parentDocument.uuid} skip_tabs={true} />}
          ExpectedChildView={
            <CreateDocumentFromObjectType
              objectTypeUUID={child_object_type_uuid}
              returnToOnSuccess={returnToOnSuccess}
            />
          }
        />
      )}
    </ViewWithLoader>
  )
}

export const CreateDocumentFromSchema = ({
  returnToOnSuccess,
}: {
  returnToOnSuccess?: string
}): ReactElement => {
  const params = useParams()
  const object_schema_uuid = params.object_schema_uuid as string
  const { data, isLoading, error } = useObjectSchemaFull({ uuid: object_schema_uuid })
  const objectType = data?.object_types
    ? (data.object_types.find((ot) => ot.uuid === data.object_schema.object_type_uuid) ??
      data.object_types[0])
    : null

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && objectType && (
        <DocumentTabs
          objectType={objectType}
          viewLabel={`${objectType.label}`}
          View={
            <CreateDocumentForm
              schema={data.object_schema}
              type={objectType}
              returnToOnSuccess={returnToOnSuccess}
            />
          }
        />
      )}
    </ViewWithLoader>
  )
}

export const CreateDocumentFromForm = ({
  returnToOnSuccess,
}: {
  returnToOnSuccess?: string
}): ReactElement => {
  const params = useParams()
  const form_uuid = params.form_uuid as string
  const { data, isLoading, error } = useFullForm({ form_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <DocumentTabs
          objectType={data.object_schema.object_type}
          viewLabel={`${data.object_schema.object_type.label}`}
          View={
            <CreateDocumentForm
              schema={omit(data.object_schema, ***REMOVED***object_type***REMOVED***)}
              type={data.object_schema.object_type}
              assetForm={data.form}
              fieldConfigs={data.field_configs}
              returnToOnSuccess={returnToOnSuccess}
            />
          }
        />
      )}
    </ViewWithLoader>
  )
}

export type ISelectDocumentFormProps = {
  returnToOnSuccess?: string
  documentCreatePath?: string
  filters?: IPostgrestFilter[]
}

export const SelectDocumentForm = ({
  returnToOnSuccess,
  documentCreatePath,
  filters,
}: ISelectDocumentFormProps): ReactElement => {
  const brand = getBrand()
  const createEntryProps: BrandComponentProps[***REMOVED***CreateDocumentEntry***REMOVED***] = {
    returnToOnSuccess,
    documentCreatePath,
  }
  const BrandCreateDocumentEntry = getBrandComponent(brand, ***REMOVED***CreateDocumentEntry***REMOVED***, createEntryProps)
  if (BrandCreateDocumentEntry) {
    return BrandCreateDocumentEntry
  }
  return (
    <DefaultSelectDocumentForm
      returnToOnSuccess={returnToOnSuccess}
      documentCreatePath={documentCreatePath}
      filters={filters}
    />
  )
}

export const DefaultSelectDocumentForm = ({
  returnToOnSuccess,
  documentCreatePath = ***REMOVED***/document/create***REMOVED***,
  filters,
}: {
  returnToOnSuccess?: string
  documentCreatePath?: string
  filters?: IPostgrestFilter[]
}): ReactElement => {
  const pgFilters: IPostgrestFilter[] = [
    {
      column: ***REMOVED***category***REMOVED***,
      operator: ***REMOVED***eq***REMOVED***,
      value: ***REMOVED***document***REMOVED***,
    },
  ]
  if (filters !== undefined) {
    pgFilters.forEach((f) => {
      pgFilters.push(f)
    })
  }
  const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
    object_type_params: {
      filters: pgFilters,
    },
  })
  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex flex-row items-center gap-2">
        <Book size={18} /> Create new document
      </h2>

      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        <div className="my-4 flex flex-col gap-4">
          {data &&
            data.object_types.map((type) => {
              const schema = data.schemas.find((s) => s.object_type_uuid === type.uuid)
              if (!schema) {
                return (
                  <div key={type.uuid}>
                    <h4 className="font-bold">{type.label}</h4>
                    <div className="">
                      <p>No schema found for this object type. Please create a schema first.</p>
                      <div className="mt-4">
                        <Link
                          to={`/form/create/${type.uuid}/object_type`}
                          className={utils.createButtonClass({
                            size: ***REMOVED***md***REMOVED***,
                            variant: ***REMOVED***primary***REMOVED***,
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
                <div key={type.uuid}>
                  <h4 className="font-bold text-lg">{type.label}</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-4 px-2 py-4">
                      {forms.map((form) => {
                        return (
                          <Link
                            key={form.uuid}
                            to={`${documentCreatePath.replace(/\/$/, ***REMOVED******REMOVED***)}/${type.uuid}/object_type/${form.uuid}/form${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ***REMOVED******REMOVED***}`}
                          >
                            {form.is_schema_and_version_default ? (
                              <>
                                <span className="text-xs text-slate-400 flex flex-row gap-2 items-center">
                                  <Check size={12} color="green" /> Default
                                </span>
                              </>
                            ) : null}
                            <span
                              className={`flex flex-row gap-2 items-center${form.is_schema_and_version_default ? ***REMOVED*** font-semibold text-lg***REMOVED*** : ***REMOVED******REMOVED***}`}
                            >
                              <BookPlus size={12} /> Form: {form.label} (schema version:{***REMOVED*** ***REMOVED***}
                              {form.object_schema_version})
                            </span>
                          </Link>
                        )
                      })}
                      <p>
                        <Link
                          to={`${documentCreatePath.replace(/\/$/, ***REMOVED******REMOVED***)}/${defaultSchema.uuid}/object_schema${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ***REMOVED******REMOVED***}`}
                          className="flex flex-row gap-2 items-center"
                        >
                          <Network size={12} /> Schema only form (version: {defaultSchema.version})
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </ViewWithLoader>
    </>
  )
}
