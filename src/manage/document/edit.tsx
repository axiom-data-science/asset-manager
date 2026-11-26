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
import { merge, omit } from 'lodash-es'
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
import { fetchDocument, patchDocument, patchDocumentIfLockAvailable } from './services'
import { useQueryClient } from '@tanstack/react-query'
import { unlockDocument } from '@/services/postgrest/services'
import { resolveDocumentEditView, type IDocumentEditViewConfig } from './edit_views'

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

const excludeFormFields = (form: IForm, excludedFieldIds: string[]): IForm => {
  const excludedIds = new Set(excludedFieldIds.map((id) => id.toLowerCase()))
  const excludeFields = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value
        .filter((item) => {
          if (typeof item !== 'object' || item === null || !('id' in item)) return true
          return typeof item.id !== 'string' || !excludedIds.has(item.id.toLowerCase())
        })
        .map(excludeFields)
    }

    if (typeof value !== 'object' || value === null) return value

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, excludeFields(child)])
    )
  }

  return excludeFields(form) as IForm
}

const DocumentLockStatus = ({
  document,
  autoLock,
  className,
}: {
  document: IDocument
  autoLock: boolean
  className?: string
}): ReactElement => {
  const auth = useAuth()
  const [locked, setLocked] = useState(document.lock_sub !== null)
  const isInitialMountRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const acquiredLockRef = useRef(false)

  const { mutate, isPending } = useLockDocumentMutation({
    onSuccess: (lockStatus) => setLocked(lockStatus),
  })

  const lockDocument = useEffectEvent(() => {
    if (!autoLock || document.lock_sub !== null) return
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    mutate(
      { document, lock: true, signal },
      {
        onSuccess: (lockStatus) => {
          acquiredLockRef.current = lockStatus
        },
      }
    )
  })

  const unlockDocument = useEffectEvent(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return // Skip unlock on first cleanup
    }
    if (!acquiredLockRef.current) return
    acquiredLockRef.current = false
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
                <div className="absolute top-10 right-0 bg-white shadow-md w-40 min-h-10 text-left px-4 py-2" onClick={(event) => event.stopPropagation()}>
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
  isLocked,
  autoLock,
  onUnlocked,
  viewConfig,
}: {
  document: IDocument
  schema: IObjectSchema
  assetForm?: IAssetForm | null
  fieldConfigs?: IFormToFieldConfigWithDetails[]
  type: IObjectType
  returnToOnSuccess?: string
  isLocked: boolean
  autoLock: boolean
  onUnlocked: () => void
  viewConfig?: IDocumentEditViewConfig
}): ReactElement => {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<IValidationError[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastSave, setLastSave] = useState<Date | null>(null)
  const [documentLabel, setDocumentLabel] = useState(document.label)
  const [documentDescription, setDocumentDescription] = useState(document.description)
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

  const baseForm = isUsingDataForm && dataForm ? dataForm : defaultForm
  const form = viewConfig?.editableMetadata
    ? isUsingDataForm && dataForm
      ? excludeFormFields(baseForm, viewConfig.excludedFormFieldIds ?? [])
      : { ...baseForm, fields: [] }
    : viewConfig?.excludedFormFieldIds?.length
      ? excludeFormFields(baseForm, viewConfig.excludedFormFieldIds)
      : baseForm

  const [formValues, setFormValues] = useState<IFormValues>({
    ...(isUsingDataForm ? (document.data as JSON) : document),
    ...(viewConfig?.editableMetadata
      ? { label: document.label, description: document.description }
      : {}),
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
    const valuesForData = isUsingDataForm ? cleanValues : cleanValues.data as JSON
    const mergedData = viewConfig?.editableMetadata
      ? merge({}, (document.data ?? {}) as object, (valuesForData ?? {}) as object)
      : {
        ...(document.data as JSON),
        ...(valuesForData as JSON),
      }
    const fieldMappings = type.data?.field_mappings
    const { label, description } = viewConfig?.editableMetadata
      ? { label: documentLabel, description: documentDescription }
      : getDocumentMetadata({
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
    const valuesToEval = requiredFieldsOnSave
      ? viewConfig?.editableMetadata
        ? formValues
        : cleanValues
      : mergedDocument
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
      const updatedDoc = await patchDocumentIfLockAvailable({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? '',
        user_sub: auth.user?.profile.sub ?? undefined,
      })

      if (!updatedDoc) {
        await queryClient.invalidateQueries({ queryKey: ['document'] })
        setErrors([
          {
            field: 'form',
            message:
              'This document is no longer available for editing because its lock state or permissions changed. Your changes were not saved.',
          },
        ])
        setSaving(false)
        return
      }

      const userSub = auth.user?.profile.sub
      if (userSub) {
        const unlocked = await unlockDocument({
          document_uuid: document.uuid,
          user_sub: userSub,
          token: auth.user?.access_token ?? '',
        })
        if (!unlocked) {
          const currentDocument = await fetchDocument({
            uuid: document.uuid,
            token: auth.user?.access_token ?? '',
          })
          if (currentDocument.lock_sub === userSub) {
            throw new Error('Document saved, but its lock could not be released.')
          }
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ['document'],
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
      setSaving(false)
    }
  }

  const [validated, setValidated] = useState(false)

  const onValidate = async () => {
    setSaving(true)
    const valuesToSave = removeUndefinedAndNullKeys(
      // get only form values intended for saving according to the form
      getters.getFormPayload(formValues, form)
    )
    const validationData = isUsingDataForm ? valuesToSave : valuesToSave.data as JSON
    const valuesToValidate = viewConfig?.editableMetadata
      ? merge({}, (document.data ?? {}) as object, (validationData ?? {}) as object)
      : valuesToSave
    const valid = await validate({
      form,
      formValues: valuesToValidate as IFormValues,
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
        {saving ? <Loader className="animate-spin" /> : 'Save full form'}
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
    <div className="relative">
      <fieldset disabled={isLocked} className="min-w-0 border-0 p-0">
        <div className="flex flex-col gap-4 relative">
          <h1 className="text-2xl font-bold flex flex-row justify-between items-center">
            <span>
              Edit {type.label} document{saving ? <Loader size="sm" /> : null}
            </span>
            <div className="flex flex-row gap-2 items-center">
              <ShareDocument document={document} />
              <DocumentLockStatus document={document} autoLock={autoLock} />
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
          {viewConfig?.editableMetadata && (
            <div className="grid gap-4">
              <label className="block text-sm font-medium">
                Label
                <input
                  type="text"
                  required
                  value={documentLabel}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setDocumentLabel(value)
                    setFormValues((previous) => ({ ...previous, label: value }))
                    setLastUpdate(new Date())
                  }}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  value={documentDescription}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setDocumentDescription(value)
                    setFormValues((previous) => ({ ...previous, description: value }))
                    setLastUpdate(new Date())
                  }}
                  rows={3}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
          )}
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
      </fieldset>
      {isLocked && (
        <LockedDocumentStatus
          document={document}
          type={type}
          onUnlocked={onUnlocked}
        />
      )}
    </div>
  )
}

const LoadSchemaAndCreateDocumentForm = ({
  document,
  skip_tabs,
  returnToOnSuccess,
  isLocked,
  autoLock,
  onUnlocked,
}: {
  document: IDocument
  skip_tabs?: boolean
  returnToOnSuccess?: string
  isLocked: boolean
  autoLock: boolean
  onUnlocked: () => void
}): ReactElement => {
  const { data, isLoading, error } = useFormAndSchemaAtObjectType({
    object_type_uuid: document.object_type_uuid,
  })
  const objectType = data?.object_schema?.object_type
  const viewConfig = objectType ? resolveDocumentEditView(objectType) : undefined
  const View = viewConfig?.View
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
        isLocked={isLocked}
        autoLock={autoLock}
        onUnlocked={onUnlocked}
        viewConfig={viewConfig}
      />
    ) : null
  const editorContent =
    editView && objectType
      ? skipTabsToUse
        ? editView
        : (
          <DocumentTabs
            objectType={objectType}
            viewLabel={`${objectType.label}`}
            document={document}
            View={editView}
          />
        )
      : null

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {editorContent &&
        (View ? <View document={document}>{editorContent}</View> : editorContent)}
    </ViewWithLoader>
  )
}

const LockedDocumentStatus = ({
  document,
  type,
  onUnlocked,
}: {
  document: IDocument
  type: IObjectType
  onUnlocked: () => void
}): ReactElement => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const canUnlock =
    document.lock_sub === auth.user?.profile?.sub || auth.isAdmin

  const handleUnlock = async () => {
    setIsUnlocking(true)
    setUnlockError(null)
    try {
      await patchDocument({
        uuid: document.uuid,
        document: {
          lock_sub: null,
          locked_at: null,
        },
        token: auth.user?.access_token ?? '',
      })
      await queryClient.invalidateQueries({
        queryKey: ['document'],
      })
      const currentDocument = await fetchDocument({
        uuid: document.uuid,
        token: auth.user?.access_token ?? '',
      })
      if (currentDocument.lock_sub !== null) {
        throw new Error('The document lock could not be cleared. Please try again.')
      }
      onUnlocked()
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-30 flex justify-center overflow-auto bg-white/70 p-6 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="locked-document-title"
    >
      <section className="mt-8 h-fit w-full max-w-2xl rounded-md border border-amber-300 bg-amber-50 p-6 shadow-lg">
        <h1 id="locked-document-title" className="text-2xl font-bold">
          Document locked
        </h1>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-semibold">Document type</dt>
          <dd>{type.label}</dd>
          <dt className="font-semibold">Document</dt>
          <dd>{document.label}</dd>
          <dt className="font-semibold">Locked by</dt>
          <dd>{document.lock_sub}</dd>
          <dt className="font-semibold">Locked at</dt>
          <dd>
            {document.locked_at
              ? new Date(document.locked_at).toLocaleString()
              : 'Unknown'}
          </dd>
        </dl>
        {canUnlock ? (
          <Button
            className="mt-6"
            onClick={handleUnlock}
            disabled={isUnlocking}
          >
            {isUnlocking ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            Unlock and edit
          </Button>
        ) : (
          <p className="mt-6 text-sm text-slate-700">
            Only the user who locked this document or an administrator can unlock it.
          </p>
        )}
        {unlockError && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Unable to unlock document: {unlockError}
          </p>
        )}
      </section>
    </div>
  )
}

const EditDocumentContent = ({
  document,
  skip_tabs,
  returnToOnSuccess,
}: {
  document: IDocument
  skip_tabs?: boolean
  returnToOnSuccess?: string
}): ReactElement => {
  const auth = useAuth()
  const [autoLock] = useState(document.lock_sub === null)
  const [unlockedDocumentUUID, setUnlockedDocumentUUID] = useState<string | null>(
    document.lock_sub === null ? document.uuid : null
  )
  const isLocked =
    document.lock_sub !== null &&
    (document.lock_sub !== auth.user?.profile?.sub ||
      unlockedDocumentUUID !== document.uuid)

  return (
    <LoadSchemaAndCreateDocumentForm
      skip_tabs={skip_tabs}
      document={document}
      returnToOnSuccess={returnToOnSuccess}
      isLocked={isLocked}
      autoLock={autoLock}
      onUnlocked={() => setUnlockedDocumentUUID(document.uuid)}
    />
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
        <EditDocumentContent
          key={document.uuid}
          document={document}
          skip_tabs={skip_tabs}
          returnToOnSuccess={returnToOnSuccess}
          />
      )}
    </ViewWithLoader>
  )

  //return <ObjectTypeLoader urlRoot="/document/create" View={LoadSchemaAndCreateDocumentForm} />
}

export default EditDocument
