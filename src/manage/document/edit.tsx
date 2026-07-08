import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
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
import { Button, Checkbox, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { Button as ShadCNButton } from ***REMOVED***@/components/ui/button***REMOVED***

import { useEffect, useEffectEvent, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***
import { cn, validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import { useDocument, useLockDocumentMutation, useSaveDocumentMutation } from ***REMOVED***./useDocument***REMOVED***
import { useFormAndSchemaAtObjectType } from ***REMOVED***@/manage/form/useForm***REMOVED***
import FileUpload from ***REMOVED***@/manage/custom_inputs/file_upload***REMOVED***
import StationSearch from ***REMOVED***@/manage/custom_inputs/station_search***REMOVED***
import SampleFileObject from ***REMOVED***../custom_inputs/sample_file_object***REMOVED***
import CSVUploadForSampleFile from ***REMOVED***../custom_inputs/csv_upload_for_sample_file***REMOVED***

import { ChevronDown, ChevronUp, Circle, Lock, Unlock } from ***REMOVED***lucide-react***REMOVED***
import ShareDocument from ***REMOVED***@/components/custom/share-document***REMOVED***

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
        ***REMOVED***w-8 h-8 flex flex-row items-center justify-center rounded-sm shadow-md bg-slate-200***REMOVED***,
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
      setIntervalId(newIntervalId)
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
            className={`w-4 h-4 ${isStale ? ***REMOVED***fill-red-500***REMOVED*** : ***REMOVED***fill-green-500***REMOVED***}`}
            style={
              intervalId !== null
                ? {
                    strokeDasharray: `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`,
                    strokeDashoffset: strokeDashoffset,
                    stroke: ***REMOVED***#666***REMOVED***,
                    strokeWidth: 2,
                    transition: ***REMOVED***stroke-dashoffset 1.1s ease-in-out***REMOVED***,
                  }
                : {
                    strokeDasharray: ***REMOVED***0 0***REMOVED***,
                    strokeDashoffset: CIRCLE_CIRCUMFERENCE,
                    stroke: ***REMOVED***#FFF***REMOVED***,
                    strokeWidth: 2,
                  }
            }
          />
          <>
            {selectorExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-800" />
                <div className="absolute top-10 right-0 bg-white shadow-md w-100 min-h-10">
                  <Checkbox
                    value={autoSave}
                    id="autosave-checkbox"
                    testId="autosave-checkbox"
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
}: {
  document: IDocument
  schema: IObjectSchema
  assetForm?: IAssetForm | null
  fieldConfigs?: IFormToFieldConfigWithDetails[]
}): ReactElement => {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<IValidationError[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastSave, setLastSave] = useState<Date | null>(null)
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

  const isUsingDataForm = !!(
    dataForm.fields?.length ||
    dataForm.pages?.length ||
    dataForm.wizard_steps?.length ||
    dataForm.tabs?.length
  )

  const form = isUsingDataForm ? dataForm : defaultForm

  const [formValues, setFormValues] = useState<IFormValues>({
    ...(isUsingDataForm ? (document.data as JSON) : document),
  } as unknown as IFormValues)

  const { mutateAsync, isPending } = useSaveDocumentMutation()

  const onSave = async () => {
    try {
      await mutateAsync({
        document,
        form,
        formValues,
        isUsingDataForm,
        validate,
      })
      navigate(***REMOVED***/document***REMOVED***)
    } catch (error) {
      setErrors([
        {
          field: ***REMOVED***form***REMOVED***,
          message: (error as Error)?.message ?? ***REMOVED***Save failed***REMOVED***,
        },
      ])
    }
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <h1 className="text-2xl font-bold flex flex-row justify-between items-center">
        <span>Edit document{isPending ? <Loader size="sm" /> : null}</span>
        <div className="flex flex-row gap-2 items-center">
          <ShareDocument document={document} />
          <DocumentLockStatus document={document} />
          <AutoSaveStatus
            lastUpdate={lastUpdate}
            lastSave={lastSave}
            isUpdating={isPending}
            onTriggerUpdate={() => {
              const d = new Date()
              setLastSave(d)
              setLastUpdate(d)
            }}
          />
        </div>
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
        }}
        onChange={() => {
          setLastUpdate(new Date())
        }}
      />
      <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10">
        <Button onClick={onSave} type="primary" disabled={isPending}>
          {isPending ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
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
