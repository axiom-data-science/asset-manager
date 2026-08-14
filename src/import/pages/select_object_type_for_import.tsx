import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***../types***REMOVED***
import { useEffect } from ***REMOVED***react***REMOVED***
import { Inputs, schemaToFormUtils, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

import {
  type LanguageName,
  quicktype,
  jsonInputForTargetLanguage,
  InputData,
  type JSONSchema,
} from ***REMOVED***quicktype-core***REMOVED***
import { Checkbox, Loader, SelectInput, Tooltip, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from ***REMOVED***@/components/ui/dialog***REMOVED***
import { CopyButton } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import { Check, TriangleAlert, X } from ***REMOVED***lucide-react***REMOVED***
import type { IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { Tabs } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import BatchLoadDocuments from ***REMOVED***@/import/components/batch_load_documents***REMOVED***
import contextStateAtom, { requestContextReloadAtom } from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { atom, useAtom, useSetAtom } from ***REMOVED***jotai***REMOVED***
import CreateObjectType from ***REMOVED***@/manage/object_type/create***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import { objectTypeForRecordsState, recordsToImportState } from ***REMOVED***@/import/state/importState***REMOVED***


const createObjectTypeFromDataState = atom(false)
const schemaStateAtom = atom<JSONSchema6 | null>(null)




async function quicktypeJSON(
  targetLanguage: LanguageName,
  typeName: string,
  jsonString: string | string[]
) {
  const jsonInput = jsonInputForTargetLanguage(***REMOVED***json-schema***REMOVED***, undefined, true, {
    ***REMOVED***no-enums***REMOVED***: true,
    ***REMOVED***all-properties-optional***REMOVED***: true,
  })

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we***REMOVED***re
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
          omit(schema as Record<string, unknown>, ***REMOVED***$schema***REMOVED***),
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
                            id: ***REMOVED***doc***REMOVED***,
                            label: ***REMOVED***Document***REMOVED***,
                            content: <div className=***REMOVED***relative***REMOVED***>
                              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-[calc(100vh-300px)]">
                                {JSON.stringify(result.document.data, null, 2)}
                              </pre>
                              <span className="absolute top-14 right-14">
                                <CopyButton size={40} value={JSON.stringify(result.document.data, null, 2)} />
                              </span>
                            </div>
                          },
                          {
                            id: ***REMOVED***errors***REMOVED***,
                            disabled: !result?.errors?.length,
                            label: result?.errors?.length
                              ? <span className={`flex flex-row gap-2 items-center ${result?.errors?.length ? ***REMOVED***text-red-600***REMOVED*** : ***REMOVED******REMOVED***}`}><TriangleAlert className=***REMOVED***w-3 h-3***REMOVED*** />  Errors ({result?.errors?.length})</span>
                              : ***REMOVED***No errors***REMOVED***,
                            content: <div className=***REMOVED***flex flex-col gap-2 w-100***REMOVED***>{result?.errors?.map(e => <p key={e.message}>{e.message}</p>)}</div>
                          }
                        ]
                      }
                    />
                  </DialogContent>
                </Dialog>
                <span className="text-xs">
                  {result.document.label ?? result.document.slug}:{***REMOVED*** ***REMOVED***}
                </span>
                {result.isValid ?
                  ***REMOVED***Valid***REMOVED*** :
                  <Tooltip content={<div className=***REMOVED***flex flex-col gap-2 text-xs w-100***REMOVED***>{result?.errors?.map(e => <p key={e.message}>{e.message}</p>)}</div>} dark={true}>
                    <span className=***REMOVED***bg-red-600 p-1 text-white text-xs flex flex-row gap-1 rounded-sm shadow-sm items-center whitespace-nowrap***REMOVED***><TriangleAlert className=***REMOVED***w-3 h-3***REMOVED*** /> {result?.errors?.length} errors</span>
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
  const [selectedObjectType, setSelectedObjectType] = useAtom(objectTypeForRecordsState)

  const { data, isLoading, error } = useQuery({
    enabled: createObjectTypeFromData,
    queryKey: [***REMOVED***eval-object-types***REMOVED***, documents],
    queryFn: async () => {
      const ob = await quicktypeJSON(
        ***REMOVED***json-schema***REMOVED***,
        ***REMOVED***test***REMOVED***,
        documents.map((d) => JSON.stringify(d.data))
      )
      const schema = JSON.parse(ob.lines.join(***REMOVED***\n***REMOVED***))
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
            id=***REMOVED***object-type-input***REMOVED***
            testId=***REMOVED***object-type-input***REMOVED***
            label=***REMOVED***Create schema and object type from data***REMOVED***
            size=***REMOVED***xs***REMOVED***
            value={createObjectTypeFromData}
            onChange={(checked) => {
              setCreateObjectTypeFromData(checked)
              const newSchema = selectedObjectType ? getSchemaForSelectedObjectType(selectedObjectType.uuid) : null
              setSchema(newSchema)
            }}
          />
          {!createObjectTypeFromData && (
            <SelectInput
              id=***REMOVED***object-type-select***REMOVED***
              testId=***REMOVED***object-type-select***REMOVED***
              placeholder=***REMOVED***Select an object type***REMOVED***
              size=***REMOVED***xs***REMOVED***
              options={contextState.object_types.map(t => {
                return {
                  label: t.label,
                  value: t.uuid
                }
              })}
              value={selectedObjectType?.uuid}
              onChange={(o) => {
                const newObjectType = o?.value !== undefined ? contextState.object_types_by_uuid[o.value] : undefined
                setSelectedObjectType(newObjectType)
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
                    id: ***REMOVED***objectTypeSchema***REMOVED***,
                    label: ***REMOVED***Object type schema***REMOVED***,
                    description:
                      ***REMOVED***The schema for the object type to be imported. This is generated from the imported data, but can be modified if needed.***REMOVED***,
                    type: ***REMOVED***json***REMOVED***,
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
  const [selectedTab, setSelectedTab] = useState(***REMOVED***preload***REMOVED***)
  const [createObjectTypeFromData] = useAtom(createObjectTypeFromDataState)
  const [schema] = useAtom(schemaStateAtom)
  const reloadContext = useSetAtom(requestContextReloadAtom)
  const [recordsToImport, setRecordsToImport] = useAtom(recordsToImportState)
  const [, setObjectTypeForRecords] = useAtom(objectTypeForRecordsState)
  return (
    <Tabs
      className="h-full p-4 bg-blue-100"
      defaultContentClassName="h-full py-5 flex-col gap-2"
      navClassName="sticky top-0 z-10 bg-blue-200 -mx-4 -mt-4 text-xs"
      selectedTab={selectedTab}
      onChange={(tabId) => setSelectedTab(tabId)}
      tabs={[
        {
          id: ***REMOVED***preload***REMOVED***,
          content: <BatchLoadDocuments
            documents={initialData}
            getFullDoc={getFullDoc}
            detailRoot={detailRoot}
            onFullDocLoaded={async (doc) => {
              console.log(***REMOVED***Full doc loaded:***REMOVED***, doc)
            }}
            onAllFullDocsLoaded={async (fullDocs) => {
              console.log(***REMOVED***All full docs loaded:***REMOVED***, fullDocs)
              setRecordsToImport(fullDocs.slice())
              setSelectedTab(***REMOVED***validate***REMOVED***)
            }}
            includeRandomSelector={true}
          />,
          label: ***REMOVED***Select and preload full records***REMOVED***
        },
        {
          id: ***REMOVED***validate***REMOVED***,
          content: <SelectObjectTypeForImport documents={recordsToImport ?? []} />,
          label: ***REMOVED***Validate against schema***REMOVED***,
          disabled: !recordsToImport?.length,
        },
        {
          id: ***REMOVED***create-new-type***REMOVED***,
          label: ***REMOVED***Create new object type***REMOVED***,
          content: <div className=***REMOVED***p-8 bg-white shadow-md***REMOVED***><CreateObjectType
            initialSchema={schema ?? undefined}
            initialLabel={label}
            onSuccess={(newObjectType) => {
              reloadContext()
              setObjectTypeForRecords(newObjectType)
              console.log(***REMOVED***New object type created:***REMOVED***, newObjectType)
            }}
          /></div>,
          disabled: !createObjectTypeFromData,
        }
      ]}
    />
  )
}
