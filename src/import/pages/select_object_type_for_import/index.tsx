import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import type { CanonicalImportRecord, ImportCandidate } from ***REMOVED***../../types***REMOVED***
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
import { useImportSession } from ***REMOVED***@/import/state/importState***REMOVED***
import ValidateAgainstSchema from ***REMOVED***./validate_against_schema***REMOVED***
import {
  convertAllEnumToOptionalStringAtPath,
  convertAllToEnumOnlyAtPath,
  convertEnumToOpenStringAtPath,
  convertToEnumOnlyAtPath,
  findEnumProperties,
  removeAllEnumAtPath,
  removeEnumAtPath,
} from ***REMOVED***./schema_enum_utils***REMOVED***
import { Redo2, Undo2, X } from ***REMOVED***lucide-react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***

const createObjectTypeFromDataState = atom(false)

export async function quicktypeJSON(
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

export const SelectObjectTypeForImportTab = ({
  documents,
  type,
  sourceId,
}: {
  documents: CanonicalImportRecord[]
  type: string
  sourceId: string
}): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const [createObjectTypeFromData, setCreateObjectTypeFromData] = useAtom(
    createObjectTypeFromDataState
  )
  const { session, setSchema, setSelectedObjectType } = useImportSession(sourceId)
  const schema = session.schema
  const selectedObjectType = session.selectedObjectType
  const initializedTypeRef = useRef<string | null>(null)

  const { data, isLoading, error } = useQuery({
    enabled: createObjectTypeFromData && documents.length > 0,
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

  if (documents.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-700">
        Prepare this source first so records are available for schema inference.
      </div>
    )
  }

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
                        <Button
                          variant=***REMOVED***outline***REMOVED***
                          size=***REMOVED***xs***REMOVED***
                          onClick={() => {
                            const newSchema = { ...schema }
                            const updatedSchema = removeAllEnumAtPath(
                              newSchema,
                              enumProps.map((p) => p.path)
                            )
                            setSchema(updatedSchema)
                          }}
                        >
                          <X
                            className="w-3 h-3 text-red-600"
                          /> Remove all enums
                        </Button>
                        <Button
                          variant=***REMOVED***outline***REMOVED***
                          size=***REMOVED***xs***REMOVED***
                          onClick={() => {
                            const newSchema = { ...schema }
                            const updatedSchema = convertAllEnumToOptionalStringAtPath(
                              newSchema,
                              enumProps.map((p) => p.path)
                            )
                            setSchema(updatedSchema)
                          }}>
                          <Redo2 className="w-3 h-3 text-green-600" /> Convert all enums to optional
                        </Button>
                        <Button
                          variant="outline"
                          size=***REMOVED***xs***REMOVED***
                          onClick={() => {
                            const newSchema = { ...schema }
                            const updatedSchema = convertAllToEnumOnlyAtPath(
                              newSchema,
                              enumProps.map((p) => p.path)
                            )
                            setSchema(updatedSchema)
                          }}
                        >
                          <Undo2
                            className="w-3 h-3 text-green-600"
                          /> Convert all enums to strict
                        </Button>
                      </div>
                      <ul className="flex flex-col gap-0 text-xs max-h-60 overflow-y-auto">
                        {enumProps.map((p) => (
                          <li key={p.path.join(***REMOVED***.***REMOVED***)} className="flex flex-row gap-2 px-3 py-2 items-start event:bg-white odd:bg-slate-100">
                            <Tooltip
                              content={`Remove enum from ${p.name} (converts to "any string")`}
                              useSpan={true}
                              dark={true}
                            >
                              <Button
                                variant="outline"
                                size=***REMOVED***xs***REMOVED***
                                onClick={() => {
                                  const newSchema = { ...schema }
                                  const updatedSchema = removeEnumAtPath(newSchema, p.path)
                                  setSchema(updatedSchema)
                                }}
                              >
                                <X
                                  className="w-3 h-3 text-red-600 cursor-pointer"
                                />
                              </Button>
                            </Tooltip>
                            {p.mode === ***REMOVED***enum-only***REMOVED*** ? (
                              <Tooltip content="Keep enum, but allow other values" useSpan={true} dark={true}>
                                <Button
                                  variant="outline"
                                  size=***REMOVED***xs***REMOVED***
                                  onClick={() => {
                                    const newSchema = { ...schema }
                                    const updatedSchema = convertEnumToOpenStringAtPath(
                                      newSchema,
                                      p.path
                                    )
                                    setSchema(updatedSchema)
                                  }}
                                >
                                  <Redo2
                                    className="w-3 h-3 text-blue-600 cursor-pointer"

                                  />
                                </Button>
                              </Tooltip>
                            ) : (
                              <Tooltip content=***REMOVED***Make enum-only (remove "any string" or "null")***REMOVED*** useSpan={true} dark={true}>
                                <Button
                                  variant="outline"
                                  size=***REMOVED***xs***REMOVED***
                                  onClick={() => {
                                    const newSchema = { ...schema }
                                    const updatedSchema = convertToEnumOnlyAtPath(newSchema, p.path)
                                    setSchema(updatedSchema)
                                  }}
                                >
                                  <Undo2
                                    className="w-3 h-3 text-blue-600 cursor-pointer"

                                  />
                                </Button>
                              </Tooltip>
                            )}
                            <span className="bg-slate-200 p-1 rounded-sm text-xs">{p.mode}</span>
                            <div className=***REMOVED***flex flex-col gap-1***REMOVED***>
                              <span className="font-bold">{p.name}</span>
                              <span className="text-gray-600">({p.path.join(***REMOVED***.***REMOVED***)})</span>
                            </div>
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
                              <span className="bg-slate-200 p-1 rounded-md shadow whitespace-nowrap">
                                {p?.enum?.length ?? 0} +
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
              sourceId={sourceId}
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
  type,
  sourceId,
}: {
  documents: ImportCandidate[]
  getFullDoc: (props: {
    doc: ImportCandidate
    url?: string
    signal?: AbortSignal
    serviceRoot?: string
  }) => Promise<CanonicalImportRecord>
  detailRoot?: string
  label?: string
  type: string
  sourceId: string
}): ReactElement => {
  const [selectedTab, setSelectedTab] = useState(***REMOVED***preload***REMOVED***)
  const [createObjectTypeFromData] = useAtom(createObjectTypeFromDataState)
  const { session, setRecords, setSelectedObjectType, setRecordResult } = useImportSession(sourceId)
  const recordsToImport = session.records
  const schema = session.schema

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
              documents={documents}
              getFullDoc={getFullDoc}
              detailRoot={detailRoot}
              onFullDocLoaded={async (doc) => {
                console.log(***REMOVED***Full doc loaded:***REMOVED***, doc)
              }}
              onAllFullDocsLoaded={async (fullDocs) => {
                console.log(***REMOVED***All full docs loaded:***REMOVED***, fullDocs)
                setRecords(fullDocs.slice())
                setSelectedTab(***REMOVED***validate***REMOVED***)
              }}
              onRecordResult={(record, result) => {
                setRecordResult(
                  record,
                  result.status === ***REMOVED***fulfilled***REMOVED***
                    ? { stage: ***REMOVED***loaded***REMOVED*** }
                    : {
                      stage: ***REMOVED***failed***REMOVED***,
                      error: result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason),
                    }
                )
              }}
              includeRandomSelector={true}
            />
          ),
          label: ***REMOVED***Select and preload full records***REMOVED***,
        },
        {
          id: ***REMOVED***validate***REMOVED***,
          content: (
            <SelectObjectTypeForImportTab
              documents={recordsToImport}
              type={type}
              sourceId={sourceId}
            />
          ),
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
                  setSelectedObjectType(newObjectType)
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
