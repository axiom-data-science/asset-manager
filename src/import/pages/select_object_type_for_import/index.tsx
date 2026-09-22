import { useQuery } from '@tanstack/react-query'
import type { CanonicalImportRecord, ImportCandidate } from '../../types'
import { Inputs } from '@axdspub/axiom-ui-forms'

import { type LanguageName, quicktype, jsonInputForTargetLanguage, InputData } from 'quicktype-core'
import { Checkbox, SelectInput, Tooltip, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useEffect, useRef, useState, type ReactElement } from 'react'

import { Tabs } from '@axdspub/axiom-ui-utilities'
import BatchLoadDocuments from '@/import/components/batch_load_documents'
import contextStateAtom from '@/state/contextStateAtom'
import { atom, useAtom } from 'jotai'
import CreateObjectType from '@/manage/object_type/create'
import type { JSONSchema6 } from 'json-schema'
import { useImportSession } from '@/import/state/importState'
import ValidateAgainstSchema from './validate_against_schema'
import {
  convertAllEnumToOptionalStringAtPath,
  convertAllToEnumOnlyAtPath,
  convertEnumToOpenStringAtPath,
  convertToEnumOnlyAtPath,
  findEnumProperties,
  removeAllEnumAtPath,
  removeEnumAtPath,
} from './schema_enum_utils'
import { Redo2, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { postObjectType } from '@/manage/object_type/services'
import { postObjectSchema } from '@/manage/object_schema/services'
import { useAuth } from '@/auth/useAuth'
import { requestContextReloadAtom } from '@/state/contextStateAtom'

const createObjectTypeFromDataState = atom(false)

export async function quicktypeJSON(
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

export const SelectObjectTypeForImportTab = ({
  documents,
  type,
  sourceId,
  label,
  sourceSchema,
}: {
  documents: CanonicalImportRecord[]
  type: string
  sourceId: string
  label?: string
  sourceSchema?: JSONSchema6
}): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const [createObjectTypeFromData, setCreateObjectTypeFromData] = useAtom(
    createObjectTypeFromDataState
  )
  const { session, setSchema, setSelectedObjectType } = useImportSession(sourceId)
  const auth = useAuth()
  const [, requestContextReload] = useAtom(requestContextReloadAtom)
  const [isCreatingAutomatically, setIsCreatingAutomatically] = useState(false)
  const [automaticCreateError, setAutomaticCreateError] = useState<string>()
  const [automaticallyCreatedTypeUuid, setAutomaticallyCreatedTypeUuid] = useState<string>()
  const schema = session.schema
  const selectedObjectType = session.selectedObjectType
  const intendedObjectType = contextState.object_type_by_slug[type]
  const createdTypeIsAvailable =
    automaticallyCreatedTypeUuid !== undefined &&
    intendedObjectType?.uuid === automaticallyCreatedTypeUuid
  const initializedTypeRef = useRef<string | null>(null)

  const { data, isLoading, error } = useQuery({
    enabled: createObjectTypeFromData && documents.length > 0,
    queryKey: ['eval-object-types', documents],
    queryFn: async () => {
      if (sourceSchema) {
        setSchema(sourceSchema)
        return sourceSchema
      }
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
    return (
      contextState.object_schema_defaults_by_object_type_uuid[objectTypeUuid]?.json_schema ?? null
    )
  }

  const enumProps = schema ? findEnumProperties(schema) : []
  const createAutomatically = async () => {
    if (!schema || intendedObjectType || !auth.user?.access_token) return
    setIsCreatingAutomatically(true)
    setAutomaticCreateError(undefined)
    try {
      const newObjectType = await postObjectType({
        object_type: {
          category: 'document',
          label: label ?? type,
          slug: type,
        },
        token: auth.user.access_token,
      })
      await postObjectSchema({
        object_schema: {
          object_type_uuid: newObjectType.uuid,
          label: `${label ?? type} default schema`,
          slug: `${type}_default`,
          description: `Automatically generated from imported records.`,
          version: 1,
          is_type_default: true,
          json_schema: schema as Record<string, unknown>,
        },
        token: auth.user.access_token,
      })
      setSelectedObjectType(newObjectType)
      setAutomaticallyCreatedTypeUuid(newObjectType.uuid)
      requestContextReload()
    } catch (error) {
      setAutomaticCreateError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsCreatingAutomatically(false)
    }
  }
  useEffect(() => {
    const defaultObjectType = contextState.object_type_by_slug[type]
    if (!defaultObjectType) return
    if (initializedTypeRef.current === type) return

    initializedTypeRef.current = type
    if (selectedObjectType?.uuid !== defaultObjectType.uuid) {
      setSelectedObjectType(defaultObjectType)
    }
    setSchema(getSchemaForSelectedObjectType(defaultObjectType.uuid))
  }, [
    contextState.object_type_by_slug,
    selectedObjectType?.uuid,
    setSchema,
    setSelectedObjectType,
    type,
  ])

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
            <>
              {createdTypeIsAvailable ? (
                <div
                  className="border border-green-300 bg-green-50 p-3 text-sm text-green-900"
                  role="status"
                >
                  Object type <strong>{type}</strong> was created successfully and is now selected
                  for this import.
                </div>
              ) : intendedObjectType ? (
                <div
                  className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                  role="alert"
                >
                  An object type with slug <strong>{type}</strong> already exists. Choose it instead
                  of creating another type.
                  <Button
                    className="mt-2"
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setCreateObjectTypeFromData(false)
                      setSelectedObjectType(intendedObjectType)
                      setSchema(getSchemaForSelectedObjectType(intendedObjectType.uuid))
                    }}
                  >
                    Use existing type
                  </Button>
                </div>
              ) : null}
              <ViewWithLoader isLoading={isLoading} error={error} data={data}>
                {data && (
                  <>
                    {enumProps.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold">Enum properties found in schema:</span>
                        <div className="flex flex-row gap-2 items-center text-xs">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              const newSchema = { ...schema }
                              const updatedSchema = removeAllEnumAtPath(
                                newSchema,
                                enumProps.map((p) => p.path)
                              )
                              setSchema(updatedSchema)
                            }}
                          >
                            <X className="w-3 h-3 text-red-600" /> Remove all enums
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              const newSchema = { ...schema }
                              const updatedSchema = convertAllEnumToOptionalStringAtPath(
                                newSchema,
                                enumProps.map((p) => p.path)
                              )
                              setSchema(updatedSchema)
                            }}
                          >
                            <Redo2 className="w-3 h-3 text-green-600" /> Convert all enums to
                            optional
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              const newSchema = { ...schema }
                              const updatedSchema = convertAllToEnumOnlyAtPath(
                                newSchema,
                                enumProps.map((p) => p.path)
                              )
                              setSchema(updatedSchema)
                            }}
                          >
                            <Undo2 className="w-3 h-3 text-green-600" /> Convert all enums to strict
                          </Button>
                        </div>
                        <ul className="flex flex-col gap-0 text-xs max-h-60 overflow-y-auto">
                          {enumProps.map((p) => (
                            <li
                              key={p.path.join('.')}
                              className="flex flex-row gap-2 px-3 py-2 items-start event:bg-white odd:bg-slate-100"
                            >
                              <Tooltip
                                content={`Remove enum from ${p.name} (converts to "any string")`}
                                useSpan={true}
                                dark={true}
                              >
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => {
                                    const newSchema = { ...schema }
                                    const updatedSchema = removeEnumAtPath(newSchema, p.path)
                                    setSchema(updatedSchema)
                                  }}
                                >
                                  <X className="w-3 h-3 text-red-600 cursor-pointer" />
                                </Button>
                              </Tooltip>
                              {p.mode === 'enum-only' ? (
                                <Tooltip
                                  content="Keep enum, but allow other values"
                                  useSpan={true}
                                  dark={true}
                                >
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => {
                                      const newSchema = { ...schema }
                                      const updatedSchema = convertEnumToOpenStringAtPath(
                                        newSchema,
                                        p.path
                                      )
                                      setSchema(updatedSchema)
                                    }}
                                  >
                                    <Redo2 className="w-3 h-3 text-blue-600 cursor-pointer" />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Tooltip
                                  content='Make enum-only (remove "any string" or "null")'
                                  useSpan={true}
                                  dark={true}
                                >
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => {
                                      const newSchema = { ...schema }
                                      const updatedSchema = convertToEnumOnlyAtPath(
                                        newSchema,
                                        p.path
                                      )
                                      setSchema(updatedSchema)
                                    }}
                                  >
                                    <Undo2 className="w-3 h-3 text-blue-600 cursor-pointer" />
                                  </Button>
                                </Tooltip>
                              )}
                              <span className="bg-slate-200 p-1 rounded-sm text-xs">{p.mode}</span>
                              <div className="flex flex-col gap-1">
                                <span className="font-bold">{p.name}</span>
                                <span className="text-gray-600">({p.path.join('.')})</span>
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
                    {!intendedObjectType && (
                      <div className="flex flex-col gap-2 border-t pt-3">
                        <Button
                          size="sm"
                          disabled={isCreatingAutomatically || !auth.user?.access_token}
                          onClick={() => void createAutomatically()}
                        >
                          {isCreatingAutomatically
                            ? 'Creating type and schema...'
                            : 'Create automatically'}
                        </Button>
                        {automaticCreateError && (
                          <div className="text-sm text-red-700" role="alert">
                            Could not create the type and schema: {automaticCreateError}
                          </div>
                        )}
                      </div>
                    )}
                    {!intendedObjectType && (
                      <div className="border-t pt-3">
                        <h3 className="mb-2 font-medium">Create object type and schema</h3>
                        <CreateObjectType
                          initialSchema={schema ?? undefined}
                          initialLabel={label ?? type}
                          onSuccess={(newObjectType) => {
                            setSelectedObjectType(newObjectType)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </ViewWithLoader>
            </>
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
  const [selectedTab, setSelectedTab] = useState('preload')
  const [createObjectTypeFromData] = useAtom(createObjectTypeFromDataState)
  const { session, setRecords, setSelectedObjectType, setRecordResult } = useImportSession(sourceId)
  const recordsToImport = session.records
  const schema = session.schema

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-blue-100 p-4">
      <Tabs
        className="h-full min-h-0 flex-1"
        defaultContentClassName="h-full min-h-0 flex-1 overflow-auto py-3 flex-col gap-2"
        navClassName="sticky top-0 z-10 bg-blue-200 -mx-4 -mt-4 text-xs"
        selectedTab={selectedTab}
        onChange={(tabId) => setSelectedTab(tabId)}
        tabs={[
          {
            id: 'preload',
            content: (
              <BatchLoadDocuments
                documents={documents}
                getFullDoc={getFullDoc}
                detailRoot={detailRoot}
                onFullDocLoaded={async (doc) => {
                  console.log('Full doc loaded:', doc)
                }}
                onAllFullDocsLoaded={async (fullDocs) => {
                  console.log('All full docs loaded:', fullDocs)
                  setRecords(fullDocs.slice())
                  setSelectedTab('validate')
                }}
                onRecordResult={(record, result) => {
                  setRecordResult(
                    record,
                    result.status === 'fulfilled'
                      ? { stage: 'loaded' }
                      : {
                        stage: 'failed',
                        error:
                          result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason),
                      }
                  )
                }}
                includeRandomSelector={true}
              />
            ),
            label: 'Select and preload full records',
          },
          {
            id: 'validate',
            content: (
              <SelectObjectTypeForImportTab
                documents={recordsToImport}
                type={type}
                sourceId={sourceId}
              />
            ),
            label: 'Validate against schema',
            disabled: !recordsToImport?.length,
          },
          {
            id: 'create-new-type',
            label: 'Create new object type',
            content: (
              <div className="p-8 bg-white shadow-md">
                <CreateObjectType
                  initialSchema={schema ?? undefined}
                  initialLabel={label}
                  onSuccess={(newObjectType) => {
                    setSelectedObjectType(newObjectType)
                    console.log('New object type created:', newObjectType)
                  }}
                />
              </div>
            ),
            disabled: !createObjectTypeFromData,
          },
        ]}
      />
    </div>
  )
}

export default SelectObjectTypeForImport
