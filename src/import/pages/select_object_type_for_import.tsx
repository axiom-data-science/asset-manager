import { useQuery } from '@tanstack/react-query'
import type { IDocumentImport, IFullDocForImport } from '../types'
import { useEffect } from 'react'
import { Inputs, schemaToFormUtils, type IFormValues } from '@axdspub/axiom-ui-forms'
import { omit } from 'lodash-es'

import {
  type LanguageName,
  quicktype,
  jsonInputForTargetLanguage,
  InputData,
  type JSONSchema,
} from 'quicktype-core'
import { Checkbox, Loader, SelectInput, Tooltip, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/button'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CopyButton } from '@/manage/components/copy_field'
import { Check, TriangleAlert, X } from 'lucide-react'
import type { IValidationError } from '@/types/types'
import { Tabs } from '@axdspub/axiom-ui-utilities'
import BatchLoadDocuments from '@/import/components/batch_load_documents'
import contextStateAtom from '@/state/contextStateAtom'
import { atom, useAtom } from 'jotai'
import CreateObjectType from '@/manage/object_type/create'
import type { JSONSchema6 } from 'json-schema'


const createObjectTypeFromDataState = atom(false)
const schemaStateAtom = atom<JSONSchema6 | null>(null)




async function quicktypeJSON(
  targetLanguage: LanguageName,
  typeName: string,
  jsonString: string | string[]
) {
  const jsonInput = jsonInputForTargetLanguage('json-schema', undefined, true, {
    'no-enums': true,
    'all-properties-optional': true,
  })

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we're
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: typeName,
    samples: Array.isArray(jsonString) ? jsonString : [jsonString],
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
  })
}

const ValidateAgainstSchema = ({
  schema,
  documents,
}: {
  schema: JSONSchema
  documents: IDocumentImport[]
}): ReactElement => {
  const [validationResults, setValidationResults] = useState<
    { document: IDocumentImport; isValid: boolean; errors?: IValidationError[] }[]
  >([])

  useEffect(() => {
    setValidationResults([])
  }, [schema])

  const [isLoading, setIsLoading] = useState(false)

  const validateDocuments = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const results = await Promise.all(
      documents.map(async (doc) => {
        const againstSchema = schemaToFormUtils.validateAgainstSchema(
          omit(schema as Record<string, unknown>, '$schema'),
          doc.data as IFormValues
        )

        return {
          document: doc,
          isValid: !againstSchema?.length,
          errors: againstSchema?.length ? againstSchema : undefined,
        }
      })
    )

    setValidationResults(results)
    setIsLoading(false)
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full relative">
        <Button onClick={validateDocuments}>Validate {documents.length} Documents</Button>
        {isLoading && <Loader className="top-30" />}
        {!isLoading &&
          <ul className="flex flex-col gap-2 h-full overflow-auto">
            {validationResults.map((result, index) => (
              <li key={index} className="flex flex-row gap-2 items-center">
                {result.isValid ? (
                  <Check className="text-green-600" />
                ) : (
                  <X className="text-red-600" />
                )}
                <Dialog modal={true}>
                  <DialogTrigger asChild>
                    <Button size="xs" className="text-white">
                      Show document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100vw-2rem)] max-w-350 sm:max-w-350 lg:max-w-[calc(100vw-100px)] flex flex-col gap-4 h-[calc(100vh-150px)]">
                    <DialogHeader className="flex flex-col gap-2 border-b pb-2">
                      <DialogTitle className="flex flex-row gap-2 items-center">
                        {result.document.label ?? result.document.slug}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs
                      tabs={
                        [
                          {
                            id: 'doc',
                            label: 'Document',
                            content: <div className='relative'>
                              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-[calc(100vh-300px)]">
                                {JSON.stringify(result.document.data, null, 2)}
                              </pre>
                              <span className="absolute top-14 right-14">
                                <CopyButton size={40} value={JSON.stringify(result.document.data, null, 2)} />
                              </span>
                            </div>
                          },
                          {
                            id: 'errors',
                            disabled: !result?.errors?.length,
                            label: result?.errors?.length
                              ? <span className={`flex flex-row gap-2 items-center ${result?.errors?.length ? 'text-red-600' : ''}`}><TriangleAlert className='w-3 h-3' />  Errors ({result?.errors?.length})</span>
                              : 'No errors',
                            content: <div className='flex flex-col gap-2 w-100'>{result?.errors?.map(e => <p key={e.message}>{e.message}</p>)}</div>
                          }
                        ]
                      }
                    />
                  </DialogContent>
                </Dialog>
                <span className="text-xs">
                  {result.document.label ?? result.document.slug}:{' '}
                </span>
                {result.isValid ?
                  'Valid' :
                  <Tooltip content={<div className='flex flex-col gap-2 text-xs w-100'>{result?.errors?.map(e => <p key={e.message}>{e.message}</p>)}</div>} dark={true}>
                    <span className='bg-red-600 p-1 text-white text-xs flex flex-row gap-1 rounded-sm shadow-sm items-center whitespace-nowrap'><TriangleAlert className='w-3 h-3' /> {result?.errors?.length} errors</span>
                  </Tooltip>
                }

              </li>
            ))}
          </ul>
        }
      </div>
    </>
  )
}

const SelectObjectTypeForImport = ({ documents }: { documents: IDocumentImport[] }): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const [schema, setSchema] = useAtom(schemaStateAtom)
  const [createObjectTypeFromData, setCreateObjectTypeFromData] = useAtom(createObjectTypeFromDataState)
  const [selectedObjectType, setSelectedObjectType] = useState<string | undefined>(undefined)
  const { data, isLoading, error } = useQuery({
    enabled: createObjectTypeFromData,
    queryKey: ['eval-object-types', documents],
    queryFn: async () => {
      const ob = await quicktypeJSON(
        'json-schema',
        'test',
        documents.map((d) => JSON.stringify(d.data))
      )
      const schema = JSON.parse(ob.lines.join('\n'))
      setSchema(schema)
      return schema
    },
  })
  const getSchemaForSelectedObjectType = (objectTypeUuid: string | undefined) => {
    if (!objectTypeUuid) return null
    return contextState.object_schema_defaults_by_object_type_uuid[objectTypeUuid]?.json_schema ?? null
  }
  return (
    <>

      <div className="flex flex-row gap-4 h-full">
        <div className="flex flex-col gap-2 w-1/2 h-full">

          <Checkbox
            id='object-type-input'
            testId='object-type-input'
            label='Create schema and object type from data'
            size='xs'
            value={createObjectTypeFromData}
            onChange={(checked) => {
              setCreateObjectTypeFromData(checked)
              const newSchema = selectedObjectType ? getSchemaForSelectedObjectType(selectedObjectType) : null
              setSchema(newSchema)
            }}
          />
          {!createObjectTypeFromData && (
            <SelectInput
              id='object-type-select'
              testId='object-type-select'
              placeholder='Select an object type'
              size='xs'
              options={contextState.object_types.map(t => {
                return {
                  label: t.label,
                  value: t.uuid
                }
              })}
              value={selectedObjectType}
              onChange={(o) => {
                setSelectedObjectType(o?.value !== undefined ? String(o.value) : undefined)
                if (o?.value !== undefined) {
                  const newSchema = getSchemaForSelectedObjectType(String(o.value))
                  setSchema({ ...newSchema })

                }

              }}
            />
          )}
          {createObjectTypeFromData && (
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>
              {data && (
                <Inputs.JSONInput
                  value={schema as JSON}
                  field={{
                    id: 'objectTypeSchema',
                    label: 'Object type schema',
                    description:
                      'The schema for the object type to be imported. This is generated from the imported data, but can be modified if needed.',
                    type: 'json',
                  }}
                  onChange={(value) => {
                    setSchema(value as JSONSchema6)
                  }}
                />
              )}
            </ViewWithLoader>
          )}
        </div>
        <div className="flex flex-col gap-2 w-1/2 h-full">
          {schema && <ValidateAgainstSchema schema={schema} documents={documents} />}
        </div>
      </div>

    </>
  )
}



export default ({
  documents,
  getFullDoc,
  detailRoot,
  label
}: {
  documents: IDocumentImport[]
  getFullDoc: (props: {
    doc: IDocumentImport
    url?: string
    signal?: AbortSignal
    serviceRoot?: string
  }) => Promise<IFullDocForImport>
  detailRoot?: string
  label?: string
}): ReactElement => {
  const initialData = documents.map((doc) => {
    return {
      ...doc,
      selected: true,
      imported: false,
      loading: false,
    }
  })
  const [fullDocs, setFullDocs] = useState<Array<IDocumentImport & IFullDocForImport> | undefined>(undefined)
  const [selectedTab, setSelectedTab] = useState('preload')
  const [createObjectTypeFromData] = useAtom(createObjectTypeFromDataState)
  const [schema] = useAtom(schemaStateAtom)
  return (
    <Tabs
      className="h-full p-4 bg-blue-100"
      defaultContentClassName="h-full py-5 flex-col gap-2"
      navClassName="sticky top-0 z-10 bg-blue-200 -mx-4 -mt-4 text-xs"
      selectedTab={selectedTab}
      onChange={(tabId) => setSelectedTab(tabId)}
      tabs={[
        {
          id: 'preload',
          content: <BatchLoadDocuments
            documents={initialData}
            getFullDoc={getFullDoc}
            detailRoot={detailRoot}
            onFullDocLoaded={async (doc) => {
              console.log('Full doc loaded:', doc)
            }}
            onAllFullDocsLoaded={async (fullDocs) => {
              console.log('All full docs loaded:', fullDocs)
              setFullDocs(fullDocs.slice())
              setSelectedTab('validate')
            }}
            includeRandomSelector={true}
          />,
          label: 'Select and preload full records'
        },
        {
          id: 'validate',
          content: <SelectObjectTypeForImport documents={fullDocs ?? []} />,
          label: 'Validate against schema',
          disabled: !fullDocs,
        },
        {
          id: 'create-new-type',
          label: 'Create new object type',
          content: <div className='p-8 bg-white shadow-md'><CreateObjectType
            initialSchema={schema ?? undefined}
            initialLabel={label}
            onSuccess={(newObjectType) => {
              console.log('New object type created:', newObjectType)
            }}
          /></div>,
          disabled: !createObjectTypeFromData,
        }
      ]}
    />
  )
}
