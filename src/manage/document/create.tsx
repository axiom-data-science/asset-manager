import { useAuth } from '@/auth/useAuth'
import { useAtom } from 'jotai'
import contextStateAtom from '@/state/contextStateAtom'
import { fetchDocument, postDocument } from '@/manage/document/services'
import { type IValidationError, type IObjectSchema, type IObjectType } from '@/types/types'
import type {
  IAssetForm,
  IDocument,
  IFormToFieldConfigWithDetails,
  IPostgrestFilter,
  IPredicate,
} from '@/types/types'
import {
  FormCreator,
  schemaToFormUtils,
  type IForm,
  type IFormFieldOverride,
  type IFormOverride,
} from '@axdspub/axiom-ui-forms'
import { Button, Loader, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { get, omit } from 'lodash-es'
import { buildStringFromTemplate, getBrand, validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import Link from '@/manage/components/link'
import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import { useFullForm } from '@/manage/form/useForm'
import FileUpload from '@/manage/custom_inputs/file_upload'
import { Book, BookPlus, Check, Network } from 'lucide-react'
import StationSearch from '../custom_inputs/station_search'
import { useSlug } from '@/manage/components/useSlug'
import SampleFileObject from '../custom_inputs/sample_file_object'
import CSVUploadForSampleFile from '../custom_inputs/csv_upload_for_sample_file'
import { getBrandComponent, type BrandComponentProps } from '@/BrandComponents'
import { useObjectTypeFull } from '@/manage/object_type/useObjectType'
import { useObjectSchemaFull } from '@/manage/object_schema/useObjectSchema'
import DocumentTabs from './document_tabs'
import { useQuery } from '@tanstack/react-query'
import { fetchSingleFromPostgrest, postToPostgrest } from '@/services/postgrest/services'
import { fetchObjectType } from '../object_type/services'
import EditDocument from './edit'
import StateSelector from '@/manage/custom_inputs/state_selector'

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
  schema: IObjectSchema
  parentDocumentUUID?: string
  toParentPredicate?: string
  childDocumentUUID?: string
  toChildPredicate?: string
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
    filterForSave,
  } = useSlug({
    form: formJSON,
    labelPath: type.data?.field_mappings?.label,
    autoSlug: true,
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
        behavior: 'smooth', // Adds a gradual animation
      })
      return
    }
    setErrors([])
    try {
      const defaultLabel =
        formValues.label ??
        formValues.title ??
        formValues.platform_name ??
        formValues.station_label ??
        'Untitled Document'
      const label = type.data?.field_mappings?.label
        ? get(valuesToSave, type.data.field_mappings.label, defaultLabel)
        : defaultLabel

      const slug = formValues.slug ?? null
      const defaultDescription = formValues.description ?? ''
      const description = type.data?.field_mappings?.description
        ? get(valuesToSave, type.data.field_mappings.description, defaultDescription)
        : defaultDescription

      const docToSave = {
        object_type_uuid: type.uuid,
        label,
        description,
        slug,
        data: useDataForm ? valuesToSave : (valuesToSave.data as JSON),
      } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>
      const newDoc = await postDocument({
        document: docToSave,
        token: auth.user?.access_token ?? '',
      })

      if (parentDocumentUUID && toParentPredicate) {
        const predicate =
          contextState.predicate_by_predicate[toParentPredicate] ??
          contextState.predicate_by_uuid[toParentPredicate]
        if (predicate) {
          await postToPostgrest({
            table: 'relationship',
            token: auth.user?.access_token ?? '',
            body: {
              predicate_uuid: predicate.uuid,
              // The relationship is from the newly created document to the parent document
              from_document_uuid: newDoc.uuid,
              to_document_uuid: parentDocumentUUID,
            },
          })
        } else {
          console.warn(`Predicate not found for parent document relationship: ${toParentPredicate}`)
        }
      }
      if (childDocumentUUID && toChildPredicate) {
        const predicateObj =
          contextState.predicate_by_predicate[toChildPredicate] ??
          contextState.predicate_by_uuid[toChildPredicate]
        if (predicateObj) {
          await postToPostgrest({
            table: 'relationship',
            token: auth.user?.access_token ?? '',
            body: {
              predicate_uuid: predicateObj.uuid,
              // The relationship is from the child document to the newly created document as it's parent
              from_document_uuid: childDocumentUUID,
              to_document_uuid: newDoc.uuid,
            },
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
          ? buildStringFromTemplate(returnToOnSuccess, {
            ...newDoc,
            ...{ parentDocumentUUID, toParentPredicate, childDocumentUUID, toChildPredicate },
            ...{ object_type: type },
          })
          : (new URLSearchParams(window.location.search).get('returnToOnSuccess') ?? undefined)

      setSaving(false)
      navigate(`${navPath ?? '/document'}?uuid=${newDoc.uuid}`)
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

  const includeSaveButton = form.wizard_steps !== undefined || form.pages !== undefined

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm text-gray-500 hidden">
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
          'custom:file_upload': FileUpload,
          'custom:sample_file_object': SampleFileObject,
          'custom:csv_upload_for_sample_file': CSVUploadForSampleFile,
          'custom:station_search': StationSearch,
          'custom:state_selector': StateSelector,
        }}
        SubmitButton={
          includeSaveButton && (
            <Button onClick={onSave} type="default" disabled={saving}>
              {saving ? <Loader className="animate-spin" /> : 'Save'}
            </Button>
          )
        }
      />
      {!includeSaveButton && (
        <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end">
          <Button onClick={onSave} type="default" disabled={saving}>
            {saving ? <Loader className="animate-spin" /> : 'Save'}
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
  const [context] = useAtom(contextStateAtom)
  const object_type_identifier = objectTypeUUID ?? (params.object_type_uuid as string)
  const object_type_uuid =
    context.object_type_by_slug[object_type_identifier]?.uuid ?? object_type_identifier
  const parentDocumentUUID = searchParams.get('parentDocumentUUID') ?? undefined
  const toParentPredicate = searchParams.get('toParentPredicate') ?? undefined
  const toChildPredicate = searchParams.get('toChildPredicate') ?? undefined
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
    queryKey: ['document', parent_document_uuid, expected_predicate, child_object_type_uuid],
    queryFn: async ({ signal }) => {
      if (!parent_document_uuid || !expected_predicate || !child_object_type_uuid) {
        throw new Error('Missing required parameters')
      }
      const parentDocument = await fetchDocument({
        uuid: parent_document_uuid,
        token: auth.user?.access_token ?? '',
        signal,
      })
      const parentObjectType = await fetchObjectType({
        uuid: parentDocument.object_type_uuid,
        token: auth.user?.access_token ?? '',
        signal,
      })
      const expectedPredicate = await fetchSingleFromPostgrest<IPredicate>({
        table: 'predicate',
        token: auth.user?.access_token ?? '',
        params: {
          filters: [
            {
              column: 'predicate',
              operator: 'eq',
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
  const [context] = useAtom(contextStateAtom)
  const object_identifier_param = params.object_schema_uuid as string
  const object_schema_uuid =
    context.object_schema_by_slug[object_identifier_param]?.uuid ?? object_identifier_param
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
  const [context] = useAtom(contextStateAtom)
  const form_identifier = params.form_uuid as string
  const form_uuid = context.form_by_slug[form_identifier]?.uuid ?? form_identifier
  const { data, isLoading, error } = useFullForm({ form_uuid })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <DocumentTabs
          objectType={data.object_schema.object_type}
          viewLabel={`${data.object_schema.object_type.label}`}
          View={
            <CreateDocumentForm
              schema={omit(data.object_schema, 'object_type')}
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
  const createEntryProps: BrandComponentProps['CreateDocumentEntry'] = {
    returnToOnSuccess,
    documentCreatePath,
  }
  const BrandCreateDocumentEntry = getBrandComponent(brand, 'CreateDocumentEntry', createEntryProps)
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
  documentCreatePath = '/document/create',
  filters,
}: {
  returnToOnSuccess?: string
  documentCreatePath?: string
  filters?: IPostgrestFilter[]
}): ReactElement => {
  const pgFilters: IPostgrestFilter[] = [
    {
      column: 'category',
      operator: 'eq',
      value: 'document',
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
                            size: 'md',
                            variant: 'default',
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
                            to={`${documentCreatePath.replace(/\/$/, '')}/${type.uuid}/object_type/${form.uuid}/form${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ''}`}
                          >
                            {form.is_schema_and_version_default ? (
                              <>
                                <span className="text-xs text-slate-400 flex flex-row gap-2 items-center">
                                  <Check size={12} color="green" /> Default
                                </span>
                              </>
                            ) : null}
                            <span
                              className={`flex flex-row gap-2 items-center${form.is_schema_and_version_default ? ' font-semibold text-lg' : ''}`}
                            >
                              <BookPlus size={12} /> Form: {form.label} (schema version:{' '}
                              {form.object_schema_version})
                            </span>
                          </Link>
                        )
                      })}
                      <p>
                        <Link
                          to={`${documentCreatePath.replace(/\/$/, '')}/${defaultSchema.uuid}/object_schema${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ''}`}
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
