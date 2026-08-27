import { useQuery } from '@tanstack/react-query'
import type { IDocumentImport, IFullDocForImport } from '../../types'
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
import { objectTypeForRecordsState, recordsToImportState } from '@/import/state/importState'
import ValidateAgainstSchema from './validate_against_schema'
import {
  convertEnumToOpenStringAtPath,
  convertToEnumOnlyAtPath,
  findEnumProperties,
  removeEnumAtPath,
} from './schema_enum_utils'
import { Redo2, Undo2, X } from 'lucide-react'

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
                          <li key={p.path.join('.')} className="flex flex-row gap-2 items-start">
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
                            {p.mode === 'enum-only' ? (
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
                              <Tooltip content='Make enum-only (remove "any string" or "null")'>
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
                            <span className="text-gray-600">({p.path.join('.')})</span>
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
  const [selectedTab, setSelectedTab] = useState('preload')
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
          id: 'preload',
          content: (
            <BatchLoadDocuments
              documents={initialData}
              getFullDoc={getFullDoc}
              detailRoot={detailRoot}
              onFullDocLoaded={async (doc) => {
                console.log('Full doc loaded:', doc)
              }}
              onAllFullDocsLoaded={async (fullDocs) => {
                console.log('All full docs loaded:', fullDocs)
                setRecordsToImport(fullDocs.slice())
                setSelectedTab('validate')
              }}
              includeRandomSelector={true}
            />
          ),
          label: 'Select and preload full records',
        },
        {
          id: 'validate',
          content: <SelectObjectTypeForImportTab documents={recordsToImport ?? []} type={type} />,
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
                  setObjectTypeForRecords(newObjectType)
                  console.log('New object type created:', newObjectType)
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
