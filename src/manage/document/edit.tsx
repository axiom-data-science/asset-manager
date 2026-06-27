import { useAuth } from '@/auth/useAuth'
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
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { omit } from 'lodash-es'
import { cn, validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { useDocument, useLockDocumentMutation, useSaveDocumentMutation } from './useDocument'
import { useFormAndSchemaAtObjectType } from '@/manage/form/useForm'
import FileUpload from '@/manage/custom_inputs/file_upload'
import StationSearch from '@/manage/custom_inputs/station_search'
import SampleFileObject from '../custom_inputs/sample_file_object'
import CSVUploadForSampleFile from '../custom_inputs/csv_upload_for_sample_file'

import { Circle, Lock, Unlock } from 'lucide-react'
import ShareDocument from '@/components/custom/share-document'

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
  const abortControllerRef = useRef<AbortController | null>(null);
  abortControllerRef.current = new AbortController();
  const signal = abortControllerRef.current.signal;
  const { mutate, isPending } = useLockDocumentMutation({
    onSuccess: (lockStatus) => setLocked(lockStatus),
    signal
  })

  useEffect(() => {
    // Always lock on effect run (first mount or remount after Strict Mode)
    mutate({ document, lock: true })

    return () => {
      // Only unlock if we're past the initial mount (skip Strict Mode cleanup)
      if (!isInitialMountRef.current) {
        mutate({ document, lock: false })
      }
      // Mark that we're past the initial mount
      isInitialMountRef.current = false
    }
  }, [document.uuid, mutate])

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

const AutoSaveStatus = ({ lastUpdate, lastSave, isUpdating, onTriggerUpdate }: { lastUpdate: Date | null, lastSave: Date | null, isUpdating: boolean, onTriggerUpdate: () => void }): ReactElement => {
  const isStale = lastUpdate === lastSave ? false : true
  const [seconds, setSeconds] = useState(0);
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const startInterval = () => {
    if (intervalId === null) {
      const newIntervalId = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
      setIntervalId(newIntervalId);
    }
  }
  const endInterval = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }
  useEffect(() => {
    if (lastUpdate !== lastSave) {
      if (intervalId === null) {
        startInterval()
      } else if (seconds >= 10) {
        onTriggerUpdate()
        setSeconds(0)
        endInterval()
      }
    }

    return () => {
      endInterval();
    };
  }, [intervalId, lastUpdate, lastSave, seconds, isStale, onTriggerUpdate]);

  return (
    <span className='w-8 h-8 flex flex-row items-center justify-center rounded-sm shadow-md bg-slate-200'>
      {
        isUpdating ? <Loader size="sm" /> : <Circle color='white' className={`w-4 h-4 ${isStale ? 'fill-red-500' : 'fill-green-500'}`} />
      }
      <span className='text-[10px]'>{seconds}</span>

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
      navigate('/document')
    } catch (error) {
      setErrors([{
        field: 'form',
        message: (error as Error)?.message ?? 'Save failed',
      }])
    }
  }


  return (
    <div className="flex flex-col gap-4 relative">
      <h1 className="text-2xl font-bold flex flex-row justify-between items-center">
        <span>Edit document{isPending ? <Loader size="sm" /> : null}</span>
        <div className="flex flex-row gap-2 items-center">
          <ShareDocument document={document} />
          <DocumentLockStatus document={document} />
          <AutoSaveStatus lastUpdate={lastUpdate} lastSave={lastSave} isUpdating={isPending} onTriggerUpdate={() => {
            const d = new Date()
            setLastSave(d)
            setLastUpdate(d)
          }} />
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
          'custom:file_upload': FileUpload,
          'custom:sample_file_object': SampleFileObject,
          'custom:csv_upload_for_sample_file': CSVUploadForSampleFile,
          'custom:station_search': StationSearch,
        }}
        onChange={() => {
          setLastUpdate(new Date())
        }}
      />
      <div className="flex flex-row gap-4  p-4 sticky bottom-0 bg-white/80 z-10">
        <Button onClick={onSave} type="primary" disabled={isPending}>
          {isPending ? <Loader className="animate-spin" /> : 'Save'}
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
