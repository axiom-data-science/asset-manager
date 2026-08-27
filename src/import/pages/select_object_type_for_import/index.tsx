import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***../../types***REMOVED***
import { Inputs } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***

import { type LanguageName, quicktype, jsonInputForTargetLanguage, InputData } from ***REMOVED***quicktype-core***REMOVED***
import { Checkbox, SelectInput, Tooltip, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useEffect, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***

import { Tabs } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import BatchLoadDocuments from ***REMOVED***@/import/components/batch_load_documents***REMOVED***
import contextStateAtom from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { atom, useAtom } from ***REMOVED***jotai***REMOVED***
import CreateObjectType from ***REMOVED***@/manage/object_type/create***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import { objectTypeForRecordsState, recordsToImportState } from ***REMOVED***@/import/state/importState***REMOVED***
import ValidateAgainstSchema from ***REMOVED***./validate_against_schema***REMOVED***
import {
  convertEnumToOpenStringAtPath,
  convertToEnumOnlyAtPath,
  findEnumProperties,
  removeEnumAtPath,
} from ***REMOVED***./schema_enum_utils***REMOVED***
import { Redo2, Undo2, X } from ***REMOVED***lucide-react***REMOVED***

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

const SelectObjectTypeForImportTab = ({
  documents,
  type
}: {
  documents: IDocumentImport[]
  type: string
}): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const [schema, setSchema] = useAtom(schemaStateAtom)
  const [createObjectTypeFromData, setCreateObjectTypeFromData] = useAtom(
    createObjectTypeFromDataState
  )
  const [selectedObjectType, setSelectedObjectType] = useAtom(objectTypeForRecordsState)
  const initializedTypeRef = useRef<string | null>(null)

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
    return (
      contextState.object_schema_defaults_by_object_type_uuid[objectTypeUuid]?.json_schema ?? null
    )
  }

  const enumProps = schema ? findEnumProperties(schema) : []
  useEffect(() => {
    const defaultObjectType = contextState.object_type_by_slug[type]
    if (!defaultObjectType) return
    if (initializedTypeRef.current === type) return

    initializedTypeRef.current = type
    if (selectedObjectType?.uuid !== defaultObjectType.uuid) {
      setSelectedObjectType(defaultObjectType)
    }
    setSchema(getSchemaForSelectedObjectType(defaultObjectType.uuid))
  }, [contextState.object_type_by_slug, selectedObjectType?.uuid, setSchema, setSelectedObjectType, type])

  return (
    <>
      <div className="flex flex-row gap-4 h-full">
        <div className="flex flex-col gap-2 w-1/2 h-full">
          <Checkbox
            id="object-type-input"
            testId="object-type-input"
            label="Create schema and object type from data"
            size="xs"
            value={createObjectTypeFromData}
            onChange={(checked) => {
              setCreateObjectTypeFromData(checked)
              const newSchema = selectedObjectType
                ? getSchemaForSelectedObjectType(selectedObjectType.uuid)
                : null
              setSchema(newSchema)
            }}
          />
          {!createObjectTypeFromData && (
            <SelectInput
              id="object-type-select"
              testId="object-type-select"
              placeholder="Select an object type"
              size="xs"
              options={contextState.object_type.map((t) => {
                return {
                  label: t.label,
                  value: t.uuid,
                }
              })}
              value={selectedObjectType?.uuid}
              onChange={(o) => {
                const newObjectType =
                  o?.value !== undefined ? contextState.object_type_by_uuid[o.value] : undefined
                setSelectedObjectType(newObjectType)
                if (o?.value !== undefined) {
                  const newSchema = getSchemaForSelectedObjectType(String(o.value))
                  setSchema({ ...newSchema })
                } else {
                  setSchema(null)
                }
              }}
            />
          )}
          {createObjectTypeFromData && (
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>
              {data && (
                <>
                  {enumProps.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold">Enum properties found in schema:</span>
                      <div className="flex flex-row gap-2 items-center text-xs">
                        <span className="flex flex-row gap-1 items-center">
                          <X className="w-3 h-3 text-red-600" /> Remove all enums
                        </span>
                        <span className="flex flex-row gap-1 items-center">
                          <Redo2 className="w-3 h-3 text-green-600" /> Convert all enums to optional
                        </span>
                        <span className="flex flex-row gap-1 items-center">
                          <Undo2 className="w-3 h-3 text-green-600" /> Convert all enums to strict
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1 text-xs">
                        {enumProps.map((p) => (
                          <li key={p.path.join(***REMOVED***.***REMOVED***)} className="flex flex-row gap-2 items-start">
                            <Tooltip
                              content={`Remove enum from ${p.name} (converts to "any string")`}
                            >
                              <X
                                className="w-3 h-3 text-red-600 cursor-pointer"
                                onClick={() => {
                                  const newSchema = { ...schema }
                                  const updatedSchema = removeEnumAtPath(newSchema, p.path)
                                  setSchema(updatedSchema)
                                }}
                              />
                            </Tooltip>
                            {p.mode === ***REMOVED***enum-only***REMOVED*** ? (
                              <Tooltip content="Keep enum, but allow other values">
                                <Redo2
                                  className="w-3 h-3 text-blue-600 cursor-pointer"
                                  onClick={() => {
                                    const newSchema = { ...schema }
                                    const updatedSchema = convertEnumToOpenStringAtPath(
                                      newSchema,
                                      p.path
                                    )
                                    setSchema(updatedSchema)
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip content=***REMOVED***Make enum-only (remove "any string" or "null")***REMOVED***>
                                <Undo2
                                  className="w-3 h-3 text-blue-600 cursor-pointer"
                                  onClick={() => {
                                    const newSchema = { ...schema }
                                    const updatedSchema = convertToEnumOnlyAtPath(newSchema, p.path)
                                    setSchema(updatedSchema)
                                  }}
                                />
                              </Tooltip>
                            )}
                            <span className="bg-slate-200 p-1 rounded-sm text-xs">{p.mode}</span>
                            <span className="font-bold">{p.name}</span>
                            <span className="text-gray-600">({p.path.join(***REMOVED***.***REMOVED***)})</span>
                            <Tooltip
                              content={
                                <ul className="list-disc pl-4 text-xs">
                                  {p?.enum?.map((e) => (
                                    <li key={String(e)}>{String(e)}</li>
                                  ))}
                                </ul>
                              }
                              useSpan={true}
                              dark={true}
                            >
                              <span className="bg-slate-200 p-1 rounded-md shadow">
                                {p?.enum?.length ?? 0} enum values
                              </span>
                            </Tooltip>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                </>
              )}
            </ViewWithLoader>
          )}
        </div>
        <div className="flex flex-col gap-2 w-1/2 h-full">
          {schema && (
            <ValidateAgainstSchema
              key={JSON.stringify(schema)}
              schema={schema}
              documents={documents}
            />
          )}
        </div>
      </div>
    </>
  )
}

const SelectObjectTypeForImport = ({
  documents,
  getFullDoc,
  detailRoot,
  label,
  type
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
  type: string
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
          content: (
            <BatchLoadDocuments
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
            />
          ),
          label: ***REMOVED***Select and preload full records***REMOVED***,
        },
        {
          id: ***REMOVED***validate***REMOVED***,
          content: <SelectObjectTypeForImportTab documents={recordsToImport ?? []} type={type} />,
          label: ***REMOVED***Validate against schema***REMOVED***,
          disabled: !recordsToImport?.length,
        },
        {
          id: ***REMOVED***create-new-type***REMOVED***,
          label: ***REMOVED***Create new object type***REMOVED***,
          content: (
            <div className="p-8 bg-white shadow-md">
              <CreateObjectType
                initialSchema={schema ?? undefined}
                initialLabel={label}
                onSuccess={(newObjectType) => {
                  setObjectTypeForRecords(newObjectType)
                  console.log(***REMOVED***New object type created:***REMOVED***, newObjectType)
                }}
              />
            </div>
          ),
          disabled: !createObjectTypeFromData,
        },
      ]}
    />
  )
}

export default SelectObjectTypeForImport
