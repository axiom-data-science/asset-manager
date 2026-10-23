import { useAuth } from '@/auth/useAuth'
import { type IValidationError, type IObjectSchema } from '@/types/types'
import type {
  IAssetForm,
  IDocument,
  IFormToFieldConfigWithDetails,
  IObjectType,
} from '@/types/types'
import {
  FormCreator,
  getters,
  resolveRefs,
  schemaToFormUtils,
  type IForm,
  type IFormCreatorHandle,
  type IFormFieldOverride,
  type IFormOverride,
  type IFormValues,
} from '@axdspub/axiom-ui-forms'
import { Button, Checkbox, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { Button as ShadCNButton } from '@/components/ui/button'

import { useEffect, useEffectEvent, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { omit } from 'lodash-es'
import {
  buildStringFromTemplate,
  cn,
  removeUndefinedAndNullKeys,
  validate,
  validateSelected,
} from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { useDocument, useLockDocumentMutation } from './useDocument'
import { useFormAndSchemaAtObjectType } from '@/manage/form/useForm'
import FileUpload from '@/manage/custom_inputs/file_upload'
import StationSearch from '@/manage/custom_inputs/station_search'
import SampleFileObject from '../custom_inputs/sample_file_object'
import CSVUploadForSampleFile from '../custom_inputs/csv_upload_for_sample_file'

import { Check, ChevronDown, ChevronUp, Circle, Lock, Unlock } from 'lucide-react'
import ShareDocument from '@/components/custom/share-document'
import DocumentTabs from './document_tabs'
import StateSelector from '@/manage/custom_inputs/state_selector'
import { getDocumentMetadata } from './documentMetadata'
import { patchDocument } from './services'
import { useQueryClient } from '@tanstack/react-query'

const isComplexSchema = (schema: unknown): boolean => {
  const pending: Array<{ value: unknown; depth: number }> = [{ value: schema, depth: 0 }]
  let nodeCount = 0

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || current.value === null || typeof current.value !== 'object') continue
    nodeCount += 1
    if (current.depth > 12 || nodeCount > 500) return true

    Object.values(current.value as Record<string, unknown>).forEach((value) => {
      pending.push({ value, depth: current.depth + 1 })
    })
  }

  return false
}

const DocumentLockStatus = ({
  document,
  className,
}: {
  document: IDocument
  className?: string
}): ReactElement => {
  const auth = useAuth()
  const [locked, setLocked] = useState(false)
  const isInitialMountRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { mutate, isPending } = useLockDocumentMutation({
    onSuccess: (lockStatus) => setLocked(lockStatus),
  })

  const lockDocument = useEffectEvent(() => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    // Always lock on effect run (first mount or remount after Strict Mode)
    mutate({ document, lock: true, signal })
  })

  const unlockDocument = useEffectEvent(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return // Skip unlock on first cleanup
    }
    mutate({ document, lock: false })
  })

  useEffect(() => {
    lockDocument()
    return () => {
      unlockDocument()
    }
  }, [])

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
      {isPending ? (
        <Loader size="sm" />
      ) : locked ? (
        <Lock className="w-4 h-4 text-slate-800" />
      ) : (
        <Unlock className="w-4 h-4 text-red-800" />
      )}
    </span>
  )
}

const AutoSaveStatus = ({
  lastUpdate,
  lastSave,
  isUpdating,
  onTriggerUpdate,
}: {
  lastUpdate: Date | null
  lastSave: Date | null
  isUpdating: boolean
  onTriggerUpdate: () => void
}): ReactElement => {
  const maxSeconds = 5
  const isStale = lastUpdate === lastSave ? false : true
  const [autoSave, setAutoSave] = useState(true)
  const [selectorExpanded, setSelectorExpanded] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [intervalId, setIntervalId] = useState<number | null>(null)
  const startInterval = () => {
    if (intervalId === null) {
      const newIntervalId = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
      setIntervalId(+newIntervalId)
    }
  }
  const endInterval = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }

  if (lastUpdate !== lastSave) {
    if (intervalId === null) {
      startInterval()
    } else if (seconds >= maxSeconds) {
      onTriggerUpdate()
      setSeconds(0)
      endInterval()
    }
  } else if (intervalId) {
    endInterval()
  }

  const progressPercentage = (seconds / (maxSeconds - 1)) * 100
  const CIRCLE_RADIUS = 8 // SVG circle radius for w-4 h-4
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressPercentage / 100)

  return (
    <ShadCNButton
      variant="outline"
      onClick={() => {
        setSelectorExpanded(!selectorExpanded)
      }}
    >
      {isUpdating ? (
        <Loader size="sm" />
      ) : (
        <>
          <Circle
            color="white"
            className={`w-4 h-4 ${isStale ? 'fill-red-500' : 'fill-green-500'}`}
            style={
              intervalId !== null
                ? {
                  strokeDasharray: `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`,
                  strokeDashoffset: strokeDashoffset,
                  stroke: '#666',
                  strokeWidth: 2,
                  transition: 'stroke-dashoffset 1.1s ease-in-out',
                }
                : {
                  strokeDasharray: '0 0',
                  strokeDashoffset: CIRCLE_CIRCUMFERENCE,
                  stroke: '#FFF',
                  strokeWidth: 2,
                }
            }
          />
          <>
            {selectorExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-800" />
                <div className="absolute top-10 right-0 bg-white shadow-md w-40 min-h-10 text-left px-4 py-2">
                  <Checkbox
                    value={autoSave}
                    id="autosave-checkbox"
                    testId="autosave-checkbox"
                    label="Auto Save"
                    onChange={(c) => {
                      setAutoSave(c)
                    }}
                  />
                </div>
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-800" />
            )}
          </>
        </>
      )}
      <span className="text-[10px] hidden">{progressPercentage?.toFixed(1)}</span>
    </ShadCNButton>
  )
}

const EditDocumentForm = ({
  document,
  schema,
  assetForm,
  fieldConfigs,
  type,
  returnToOnSuccess,
}: {
  document: IDocument
  schema: IObjectSchema
  assetForm?: IAssetForm | null
  fieldConfigs?: IFormToFieldConfigWithDetails[]
  type: IObjectType
  returnToOnSuccess?: string
}): ReactElement => {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<IValidationError[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastSave, setLastSave] = useState<Date | null>(null)
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
    fieldConfigs?.map(
      (fc) => fc.fields_override_config.config as unknown as IFormFieldOverride[]
    ) ?? []
  const hasConfiguredForm =
    assetForm?.use_form_config === true &&
    assetForm.form_config !== undefined &&
    assetForm.form_config !== null
  const complexSchema = isComplexSchema(schema.json_schema)
  const dataForm =
    hasConfiguredForm || !complexSchema
      ? ((hasConfiguredForm
        ? assetForm.form_config
        : assetForm?.schema_override_config !== undefined || fieldConfigJSON !== undefined
          ? omit(
            schemaToFormUtils.overridesAndSchemaToFormObject({
              schema: schema.json_schema,
              formOverrides: assetForm?.schema_override_config
                ? [assetForm?.schema_override_config as IFormOverride]
                : undefined,
              formFieldOverrides: fieldConfigJSON ? fieldConfigJSON : undefined,
            }),
            'label'
          )
          : schemaToFormUtils.schemaToFormObject(schema.json_schema)) as IForm)
      : undefined

  const isUsingDataForm = !!(
    dataForm?.fields?.length ||
    dataForm?.pages?.length ||
    dataForm?.wizard_steps?.length ||
    dataForm?.tabs?.length
  )

  const form = isUsingDataForm && dataForm ? dataForm : defaultForm

  const [formValues, setFormValues] = useState<IFormValues>({
    ...(isUsingDataForm ? (document.data as JSON) : document),
  } as unknown as IFormValues)

  const [saving, setSaving] = useState(false)
  const auth = useAuth()
  const queryClient = useQueryClient()

  const onSave = async () => {
    setSaving(true)

    const cleanValues = removeUndefinedAndNullKeys(
      // get only form values intended for saving according to the form
      getters.getFormPayload(formValues, form)
    )
    const mergedData = {
      ...(document.data as JSON),
      ...(isUsingDataForm ? cleanValues : (cleanValues.data as JSON)),
    }
    const fieldMappings = type.data?.field_mappings
    const { label, description } = getDocumentMetadata({
      formValues,
      valuesToSave: cleanValues as IFormValues,
      labelPath: fieldMappings?.label,
      descriptionPath: fieldMappings?.description,
    })

    const mergedDocument = {
      ...document,
      label,
      description,
      data: mergedData,
    } as IDocument

    const requiredFieldsOnSave = type.data?.required_fields_on_save
    const valuesToEval = requiredFieldsOnSave ? cleanValues : mergedDocument
    const valid = validateSelected({
      form,
      formValues: valuesToEval as IFormValues,
      requiredFields: requiredFieldsOnSave ?? ['label'],
    })
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
      const updatedDoc = await patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? '',
      })

      queryClient.invalidateQueries({
        queryKey: ['document'],
      })
      queryClient.invalidateQueries({
        queryKey: ['document', document.uuid],
      })

      const navPath =
        returnToOnSuccess !== undefined
          ? buildStringFromTemplate(returnToOnSuccess, {
            ...updatedDoc,
            ...{ object_type: type },
          })
          : (new URLSearchParams(window.location.search).get('returnToOnSuccess') ?? undefined)

      navigate(navPath ?? '/document')
    } catch (error) {
      setErrors([
        {
          field: 'form',
          message: (error as Error)?.message ?? 'Save failed',
        },
      ])
    }
  }

  const [validated, setValidated] = useState(false)

  const onValidate = async () => {
    setSaving(true)
    const valuesToSave = removeUndefinedAndNullKeys(
      // get only form values intended for saving according to the form
      getters.getFormPayload(formValues, form)
    )
    const valid = await validate({
      form,
      formValues: valuesToSave as IFormValues,
      schema: resolveRefs(schema.json_schema) as Record<string, unknown>,
    })
    if (!valid.valid && valid.errors.length > 0) {
      setErrors(valid.errors)
      setSaving(false)
      setValidated(false)
      window.scrollTo({
        top: 0,
        behavior: 'smooth', // Adds a gradual animation
      })
      return
    }
    setErrors([])
    setSaving(false)
    setValidated(true)
  }

  const includeSaveButton = form.wizard_steps !== undefined || form.pages !== undefined
  const saveButton = (
    <>
      <Button onClick={onSave} type="default" disabled={saving}>
        {saving ? <Loader className="animate-spin" /> : 'Save'}
      </Button>
      <Button onClick={onValidate} type="outline" disabled={saving}>
        {saving ? (
          <Loader className="animate-spin" />
        ) : (
          <>{validated ? <Check className="inline-block" color="green" /> : ''} Validate</>
        )}
      </Button>
    </>
  )

  const formRef = useRef<IFormCreatorHandle>(null)

  return (
    <div className="flex flex-col gap-4 relative">
      <h1 className="text-2xl font-bold flex flex-row justify-between items-center">
        <span>
          Edit {type.label} document{saving ? <Loader size="sm" /> : null}
        </span>
        <div className="flex flex-row gap-2 items-center">
          <ShareDocument document={document} />
          <DocumentLockStatus document={document} />
          <AutoSaveStatus
            lastUpdate={lastUpdate}
            lastSave={lastSave}
            isUpdating={saving}
            onTriggerUpdate={() => {
              const d = new Date()
              setLastSave(d)
              setLastUpdate(d)
            }}
          />
        </div>
      </h1>
      <Errors errors={errors} formRef={formRef} />
      {complexSchema && !hasConfiguredForm && (
        <div className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          This schema is too complex for generated fields, so the document data is shown as JSON.
        </div>
      )}
      <FormCreator
        ref={formRef}
        form={{
          ...form,
          label: undefined,
          settings: {
            ...form.settings
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
        onChange={() => {
          setLastUpdate(new Date())
        }}
        SubmitButton={includeSaveButton && saveButton}
      />
      {!includeSaveButton && (
        <div className="sticky bottom-0 bg-white/80 z-10 -mx-1 justify-end flex flex-row gap-4 p-4">{saveButton}</div>
      )}
    </div>
  )
}

const LoadSchemaAndCreateDocumentForm = ({
  document,
  skip_tabs,
  returnToOnSuccess,
}: {
  document: IDocument
  skip_tabs?: boolean
  returnToOnSuccess?: string
}): ReactElement => {
  const { data, isLoading, error } = useFormAndSchemaAtObjectType({
    object_type_uuid: document.object_type_uuid,
  })
  const objectType = data?.object_schema?.object_type
  const urlSkipTabs = new URLSearchParams(window.location.search).get('skip_tabs')
  const skipTabsToUse = skip_tabs ?? urlSkipTabs === 'true'
  const editView =
    data && objectType ? (
      <EditDocumentForm
        document={document}
        schema={data.object_schema}
        assetForm={data.forms.find((f) => f.is_schema_and_version_default) ?? data.forms[0]}
        type={objectType}
        fieldConfigs={data.field_configs}
        returnToOnSuccess={returnToOnSuccess}
      />
    ) : null
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {editView &&
        objectType &&
        (skipTabsToUse ? (
          editView
        ) : (
          <DocumentTabs
            objectType={objectType}
            viewLabel={`${objectType.label}`}
            document={document}
            View={editView}
          />
        ))}
    </ViewWithLoader>
  )
}

const EditDocument = ({
  document_uuid,
  skip_tabs,
  returnToOnSuccess,
}: {
  document_uuid?: string
  skip_tabs?: boolean
  returnToOnSuccess?: string
}): ReactElement => {
  const params = useParams()
  const uuid = document_uuid ?? params.uuid ?? null

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
      {document && (
        <LoadSchemaAndCreateDocumentForm
          skip_tabs={skip_tabs}
          document={document as IDocument}
          returnToOnSuccess={returnToOnSuccess}
        />
      )}
    </ViewWithLoader>
  )

  //return <ObjectTypeLoader urlRoot="/document/create" View={LoadSchemaAndCreateDocumentForm} />
}

export default EditDocument
