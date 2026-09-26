import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { FileSpreadsheet, X } from 'lucide-react'
import { schemaToFormUtils, type IFieldInputProps, type IFormValues } from '@axdspub/axiom-ui-forms'
import { AutoComplete, type ISelectOptionProps } from '@axdspub/axiom-ui-utilities'
import type { ParsedCSV } from '@/lib/csv'
import type { JSONSchema6 } from 'json-schema'
import FileUpload from '@/manage/custom_inputs/file_upload'
import {
  createCSVImportAdapter,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  inferCSVImportMapping,
  isCSVImportMappingComplete,
  getAvailableCSVSchemaFieldPaths,
  getCSVArrayItemSchema,
  getCSVSchemaFields,
  inferCSVSchemaFieldMappings,
} from '../csv_adapter'
import type { CSVImportMapping } from '../csv_adapter'
import type {
  ImportArraySourceTarget,
  ImportRelationshipRule,
  ImportSourceAdapter,
} from '../types'
import { mergeArraySourceRecordsIntoParentRecords } from '../import_all_plan'
import ImportRecordsPage from './index'
import { Button } from '@/components/ui/button'
import { useImportSession } from '../state/importState'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import { omit } from 'lodash-es'
import { uploadedImportSourcesAtom } from '../state/uploadedImportSources'
import { ImportWizard } from '../components/import_wizard'

const csvField = {
  id: 'csv-file',
  label: 'CSV file',
  description: 'Upload CSV files to preview and import them as independent sources.',
} as IFieldInputProps['field']

type CSVImportSource = {
  sourceId: string
  config: CSVImportSourceConfig
  typeSlug: string
  selectedObjectTypeUuid?: string
  fileName: string
  fileText: string
  parsed: ParsedCSV
  mapping: CSVImportMapping
  relationshipFields: string[]
  relationshipRule?: ImportRelationshipRule
  adapter: ImportSourceAdapter
  startAtImport: boolean
}

export type CSVImportSourceConfig = {
  key: string
  label: string
  description?: string
  fileName?: string
  typeSlug: string
  typeKnown: boolean
  mapping: 'required' | 'assumed'
  relationshipFields?: string[]
  arrayTarget?: ImportArraySourceTarget
}

export type CSVImportViewConfig = {
  mapping: 'required' | 'assumed'
  relationships: 'user-configured' | 'fixed'
  knownObjectTypeSlug?: string
  relationshipFields?: string[]
  relationshipRules?: ImportRelationshipRule[]
  sourceConfigs?: CSVImportSourceConfig[]
}

const defaultCSVImportViewConfig: CSVImportViewConfig = {
  mapping: 'required',
  relationships: 'user-configured',
}

const resolveCSVImportSourceConfig = (
  viewConfig: CSVImportViewConfig,
  fileName: string
): CSVImportSourceConfig => {
  const fileTypeSlug = csvFileNameToTypeSlug(fileName)
  const configuredSource = viewConfig.sourceConfigs?.find(
    (sourceConfig) =>
      sourceConfig.fileName === fileName || sourceConfig.typeSlug === fileTypeSlug
  )
  if (configuredSource) return configuredSource

  const typeSlug = viewConfig.knownObjectTypeSlug ?? fileTypeSlug
  return {
    key: typeSlug,
    label: csvFileNameToTypeLabel(fileName),
    fileName,
    typeSlug,
    typeKnown: viewConfig.knownObjectTypeSlug !== undefined,
    mapping: viewConfig.mapping,
    relationshipFields: viewConfig.relationshipFields,
  }
}

const createSourceId = (typeSlug: string, sourceNumber: number, sourceKey?: string): string =>
  `${sourceKey ?? typeSlug}-${sourceNumber}`

const SchemaFieldOptionView = ({
  title,
  path,
  required,
}: ISelectOptionProps): ReactElement => (
  <div className="flex min-w-0 flex-col py-1">
    <div className="font-semibold">
      {Boolean(required) && <span className="mr-1 text-red-600">*</span>}
      <span>{String(title)}</span>
    </div>
    <div className="truncate text-xs text-gray-500">{String(path)}</div>
  </div>
)

const CSVSourceEditor = ({
  source,
  sources,
  onChange,
  mode,
  viewConfig,
}: {
  source: CSVImportSource
  sources: CSVImportSource[]
  onChange: (update: Partial<CSVImportSource>) => void
  mode: 'mapping' | 'relationships'
  viewConfig: CSVImportViewConfig
}): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const selectedObjectType = source.selectedObjectTypeUuid
    ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
    : contextState.object_type_by_slug[source.typeSlug]
  const selectedSchema = selectedObjectType
    ? (contextState.object_schema_defaults_by_object_type_uuid[selectedObjectType.uuid]
      ?.json_schema as JSONSchema6 | undefined)
    : undefined
  const mappingSchema = source.config.arrayTarget
    ? getCSVArrayItemSchema(selectedSchema, source.config.arrayTarget.arrayFieldPath)
    : selectedSchema
  const schemaFields = getCSVSchemaFields(mappingSchema)

  const rebuildAdapter = (
    mapping: CSVImportMapping,
    relationshipFields: string[],
    relationshipRule?: ImportRelationshipRule
  ) =>
    createCSVImportAdapter({
      id: source.sourceId,
      label: csvFileNameToTypeLabel(source.fileName),
      text: source.fileText,
      mapping,
      relationshipFields,
      relationshipRules:
        viewConfig.relationships === 'fixed'
          ? viewConfig.relationshipRules
          : relationshipRule
            ? [relationshipRule]
            : undefined,
      arrayTarget: source.config.arrayTarget,
      sourceKey: source.config.key,
      schema: source.config.arrayTarget
        ? getCSVArrayItemSchema(selectedSchema, source.config.arrayTarget.arrayFieldPath)
        : selectedSchema,
    })

  const updateMapping = (mapping: CSVImportMapping) => {
    onChange({
      mapping,
      adapter: rebuildAdapter(mapping, source.relationshipFields, source.relationshipRule),
      startAtImport: false,
    })
  }

  return (
    <>
      {mode === 'mapping' && source.config.mapping === 'assumed' && (
        <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV assumed mapping">
          <h2 className="font-semibold">Mapping assumed</h2>
          <p className="text-sm text-gray-600">
            CSV column names are used as document data fields without additional mapping.
          </p>
        </section>
      )}
      {mode === 'mapping' && source.config.mapping === 'required' && !source.config.typeKnown && (
        <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV object type">
          <div className="mb-3">
            <h2 className="font-semibold">Object type</h2>
            <p className="text-sm text-gray-600">
              Use the filename-based type or choose an existing type and map columns to its schema.
            </p>
          </div>
          <select
            value={selectedObjectType?.uuid ?? ''}
            onChange={(event) => {
              const nextType = event.target.value
                ? contextState.object_type_by_uuid[event.target.value]
                : undefined
              const nextSchema = nextType
                ? (contextState.object_schema_defaults_by_object_type_uuid[nextType.uuid]
                  ?.json_schema as JSONSchema6 | undefined)
                : undefined
              const nextTypeSlug = nextType?.slug ?? csvFileNameToTypeSlug(source.fileName)
              const dataColumns = source.mapping.dataColumns ?? []
              const nextMappingSchema = source.config.arrayTarget
                ? getCSVArrayItemSchema(nextSchema, source.config.arrayTarget.arrayFieldPath)
                : nextSchema
              const fieldMappings = nextType
                ? inferCSVSchemaFieldMappings(dataColumns, nextMappingSchema)
                : undefined
              const relationshipRule = source.relationshipRule
                ? {
                  ...source.relationshipRule,
                  parentObjectTypeSlug: nextTypeSlug,
                }
                : undefined
              onChange({
                selectedObjectTypeUuid: nextType?.uuid,
                typeSlug: nextTypeSlug,
                mapping: { ...source.mapping, fieldMappings },
                relationshipRule,
                adapter: createCSVImportAdapter({
                  id: source.sourceId,
                  label: csvFileNameToTypeLabel(source.fileName),
                  text: source.fileText,
                  mapping: { ...source.mapping, fieldMappings },
                  relationshipFields: source.relationshipFields,
                  relationshipRules: relationshipRule ? [relationshipRule] : undefined,
                  arrayTarget: source.config.arrayTarget,
                  sourceKey: source.config.key,
                  schema: source.config.arrayTarget
                    ? getCSVArrayItemSchema(nextSchema, source.config.arrayTarget.arrayFieldPath)
                    : nextSchema,
                }),
                startAtImport: false,
              })
            }}
            className="border px-2 py-1"
          >
            <option value="">Use filename-based type: {csvFileNameToTypeSlug(source.fileName)}</option>
            {contextState.object_type.map((objectType) => (
              <option key={objectType.uuid} value={objectType.uuid}>
                {objectType.label} ({objectType.slug})
              </option>
            ))}
          </select>
          {source.selectedObjectTypeUuid && !selectedSchema && (
            <p className="mt-2 text-sm text-amber-700" role="alert">
              The selected type has no default schema. Choose another type or create a default schema before importing.
            </p>
          )}
        </section>
      )}
      {mode === 'mapping' && source.config.mapping === 'required' && (
        <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV preview">
          <div className="mb-3 flex flex-wrap items-baseline gap-3">
            <h2 className="font-semibold">Preview</h2>
            <span className="text-sm text-gray-600">
              {source.parsed.data.length} rows, {source.parsed.headers.length} columns
            </span>
          </div>
          <div className="max-w-full max-h-64 overflow-auto border">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  {source.parsed.headers.map((header) => (
                    <th key={header.key} className="border-b px-3 py-2 font-medium">
                      <div>{header.key}</div>
                      <div className="text-xs font-normal text-gray-500">{header.type}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {source.parsed.data.slice(0, 25).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-b-0">
                    {source.parsed.headers.map((header) => (
                      <td key={header.key} className="max-w-64 truncate px-3 py-2">
                        {String(row[header.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === 'relationships' && <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV relationship fields">
        <div className="mb-3">
          <h2 className="font-semibold">Relationship fields</h2>
          <p className="text-sm text-gray-600">
            Select columns used to match this CSV source to a related parent or child type.
          </p>
        </div>
        {viewConfig.relationships === 'fixed' ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {(source.config.relationshipFields ?? []).map((field) => (
                <span key={field} className="border px-2 py-1">
                  {field}
                </span>
              ))}
            </div>
            {(viewConfig.relationshipRules ?? []).map((rule) => (
              <div
                key={`${rule.parentObjectTypeSlug}-${rule.childObjectTypeSlug}-${rule.predicate}`}
                className="border p-2"
              >
                {rule.parentObjectTypeSlug} ({rule.parentMatchField ?? 'identity'}) {'->'}{' '}
                {rule.childObjectTypeSlug} ({rule.childMatchField ?? 'identity'}) · {rule.predicate}
              </div>
            ))}
          </div>
        ) : <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {source.parsed.headers.map((header) => {
            const selected = source.relationshipFields.includes(header.key)
            return (
              <label key={header.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const relationshipFields = new Set(source.relationshipFields)
                    if (event.target.checked) relationshipFields.add(header.key)
                    else relationshipFields.delete(header.key)
                    const nextRelationshipFields = Array.from(relationshipFields)
                    onChange({
                      relationshipFields: nextRelationshipFields,
                      adapter: rebuildAdapter(
                        source.mapping,
                        nextRelationshipFields,
                        source.relationshipRule
                      ),
                      startAtImport: false,
                    })
                  }}
                />
                {header.key}
              </label>
            )
          })}
        </div>}
      </section>}

      {mode === 'relationships' && viewConfig.relationships === 'user-configured' && <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV relationship rule">
        <div className="mb-3">
          <h2 className="font-semibold">Relationship rule</h2>
          <p className="text-sm text-gray-600">
            Configure this CSV as the parent of another uploaded CSV source.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Child CSV</span>
            <select
              value={source.relationshipRule?.childObjectTypeSlug ?? ''}
              onChange={(event) => {
                const child = sources.find(
                  (candidate) => candidate.typeSlug === event.target.value
                )
                const childObjectTypeSlug = child?.typeSlug
                const relationshipRule = childObjectTypeSlug
                  ? {
                    parentObjectTypeSlug: source.typeSlug,
                    childObjectTypeSlug,
                    parentMatchField: source.relationshipRule?.parentMatchField ?? '',
                    childMatchField: source.relationshipRule?.childMatchField ?? '',
                    predicate: source.relationshipRule?.predicate || 'has_parent',
                  }
                  : undefined
                onChange({
                  relationshipRule,
                  adapter: rebuildAdapter(
                    source.mapping,
                    source.relationshipFields,
                    relationshipRule
                  ),
                  startAtImport: false,
                })
              }}
              className="border px-2 py-1"
            >
              <option value="">No relationship rule</option>
              {sources
                .filter((candidate) => candidate.sourceId !== source.sourceId)
                .map((candidate) => (
                  <option key={candidate.sourceId} value={candidate.typeSlug}>
                    {candidate.fileName}
                  </option>
                ))}
            </select>
          </label>
          {source.relationshipRule && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Parent field</span>
                <select
                  value={source.relationshipRule.parentMatchField ?? ''}
                  onChange={(event) => {
                    const relationshipRule = {
                      ...source.relationshipRule!,
                      parentMatchField: event.target.value,
                    }
                    onChange({
                      relationshipRule,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        relationshipRule
                      ),
                    })
                  }}
                  className="border px-2 py-1"
                >
                  <option value="">Select a field</option>
                  {source.parsed.headers.map((header) => (
                    <option key={header.key} value={header.key}>
                      {header.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Child field</span>
                <select
                  value={source.relationshipRule.childMatchField ?? ''}
                  onChange={(event) => {
                    const relationshipRule = {
                      ...source.relationshipRule!,
                      childMatchField: event.target.value,
                    }
                    onChange({
                      relationshipRule,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        relationshipRule
                      ),
                    })
                  }}
                  className="border px-2 py-1"
                >
                  <option value="">Select a field</option>
                  {sources
                    .find(
                      (candidate) =>
                        candidate.typeSlug === source.relationshipRule?.childObjectTypeSlug
                    )
                    ?.parsed.headers.map((header) => (
                      <option key={header.key} value={header.key}>
                        {header.key}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Predicate</span>
                <input
                  value={source.relationshipRule.predicate}
                  onChange={(event) => {
                    const relationshipRule = {
                      ...source.relationshipRule!,
                      predicate: event.target.value,
                    }
                    onChange({
                      relationshipRule,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        relationshipRule
                      ),
                    })
                  }}
                  className="border px-2 py-1"
                />
              </label>
            </>
          )}
        </div>
      </section>}

      {mode === 'mapping' && <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV field mapping">
        <div className="mb-3">
          <h2 className="font-semibold">Map CSV fields</h2>
          <p className="text-sm text-gray-600">
            Choose each column&apos;s document role, whether it is included as data, and its schema
            field when a type is selected.
          </p>
        </div>
        <div className="max-w-full overflow-auto border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border-b px-3 py-2 font-medium">CSV column / Include</th>
                <th className="border-b px-3 py-2 font-medium">Document role</th>
                {source.selectedObjectTypeUuid && schemaFields.length > 0 && (
                  <th className="border-b px-3 py-2 font-medium">Schema field</th>
                )}
              </tr>
            </thead>
            <tbody>
              {source.parsed.headers.map((header) => {
                const specialField = (['label', 'slug', 'externalId', 'description'] as const)
                  .find((field) => source.mapping[field] === header.key)
                const included = source.mapping.dataColumns?.includes(header.key) ?? false
                const currentSchemaField = source.mapping.fieldMappings?.[header.key] ?? ''
                const usedSchemaFields = getAvailableCSVSchemaFieldPaths(
                  source.mapping,
                  header.key
                )
                const toggleDataInclusion = (include: boolean) => {
                  if (!specialField) {
                    updateColumn(include ? 'data' : 'ignore')
                    return
                  }
                  const dataColumns = new Set(source.mapping.dataColumns ?? [])
                  if (include) dataColumns.add(header.key)
                  else dataColumns.delete(header.key)
                  updateMapping({ ...source.mapping, dataColumns: Array.from(dataColumns) })
                }
                const updateColumn = (
                  role: 'label' | 'slug' | 'externalId' | 'description' | 'data' | 'ignore'
                ) => {
                  const nextMapping = { ...source.mapping }
                    ; (['label', 'slug', 'externalId', 'description'] as const).forEach((field) => {
                      if (nextMapping[field] === header.key) nextMapping[field] = undefined
                    })
                  nextMapping.dataColumns = (nextMapping.dataColumns ?? []).filter(
                    (column) => column !== header.key
                  )
                  if (role === 'data') nextMapping.dataColumns.push(header.key)
                  if (role !== 'ignore' && role !== 'data') nextMapping[role] = header.key
                  if (role === 'ignore') {
                    const fieldMappings = { ...(nextMapping.fieldMappings ?? {}) }
                    delete fieldMappings[header.key]
                    nextMapping.fieldMappings = fieldMappings
                  }
                  updateMapping(nextMapping)
                }
                return (
                  <tr key={header.key} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(event) => toggleDataInclusion(event.target.checked)}
                          aria-label={`Include ${header.key} as data`}
                        />
                        <span>
                          <span className="block">{header.key}</span>
                          <span className="block text-xs font-normal text-gray-500">{header.type}</span>
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={specialField ?? (included ? 'data' : 'ignore')}
                        onChange={(event) => updateColumn(event.target.value as Parameters<typeof updateColumn>[0])}
                        className="border px-2 py-1"
                      >
                        <option value="ignore">Ignore</option>
                        <option value="data">Data field</option>
                        <option value="label">Label</option>
                        <option value="slug">Slug</option>
                        <option value="externalId">External ID</option>
                        <option value="description">Description</option>
                      </select>
                    </td>
                    {source.selectedObjectTypeUuid && schemaFields.length > 0 && (
                      <td className="px-3 py-2">
                        <AutoComplete
                          id={`schema-field-${source.sourceId}-${header.key}`}
                          testId={`schema-field-${source.sourceId}-${header.key}`}
                          placeholder="Keep CSV column name"
                          includePrompt
                          value={currentSchemaField}
                          disabled={!included}
                          onChange={(event) => {
                            const fieldMappings = { ...(source.mapping.fieldMappings ?? {}) }
                            const nextPath = typeof event?.value === 'string' ? event.value : ''
                            if (nextPath) fieldMappings[header.key] = nextPath
                            else delete fieldMappings[header.key]
                            updateMapping({ ...source.mapping, fieldMappings })
                          }}
                          options={schemaFields
                            .filter((field) => !usedSchemaFields.has(field.path))
                            .map((field) => ({
                              label: `${field.title} · ${field.path}`,
                              value: field.path,
                              title: field.title,
                              path: field.path,
                              required: field.required,
                            }))}
                          OptionView={SchemaFieldOptionView}
                          className="max-w-[34rem]"
                          size="sm"
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>}
    </>
  )
}

const CSVImportPage = ({
  viewConfig = defaultCSVImportViewConfig,
}: {
  viewConfig?: CSVImportViewConfig
}): ReactElement => {
  const [sources, setSources] = useState<CSVImportSource[]>([])
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'records'>('upload')
  const [activeWizardStep, setActiveWizardStep] = useState<'upload' | 'mapping' | 'import'>('upload')
  const [uploadMultipleFiles, setUploadMultipleFiles] = useState(false)
  const [uploadKey, setUploadKey] = useState(0)
  const sourceSequence = useRef(0)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [contextState] = useAtom(contextStateAtom)
  const [, setUploadedImportSources] = useAtom(uploadedImportSourcesAtom)
  const activeSource = sources.find((source) => source.sourceId === activeSourceId) ?? null
  const activeSession = useImportSession(activeSource?.sourceId ?? 'csv-upload')
  const configuredParentSource = sources.find((source) => !source.config.arrayTarget)
  const parentSession = useImportSession(
    configuredParentSource?.sourceId ?? 'csv-configured-parent'
  )
  const sourceCountLabel = useMemo(
    () => `${sources.length} CSV source${sources.length === 1 ? '' : 's'}`,
    [sources.length]
  )

  useEffect(() => {
    if (sources.length === 0) return
    setUploadedImportSources((current) => {
      const sourceIds = new Set(sources.map((source) => source.adapter.id))
      return [
        ...current.filter((source) => !sourceIds.has(source.sourceAdapter.id)),
        ...sources.map((source) => ({
          type: source.typeSlug,
          label: source.config.label,
          sourceAdapter: source.adapter,
        })),
      ]
    })
  }, [setUploadedImportSources, sources])

  const addSource = (
    fileData: string,
    parsed: ParsedCSV,
    fileName: string,
    configuredSource?: CSVImportSourceConfig
  ) => {
    const sourceConfig = configuredSource ?? resolveCSVImportSourceConfig(viewConfig, fileName)
    const typeSlug = sourceConfig.typeSlug
    const existingType = contextState.object_type_by_slug[typeSlug]
    const existingSchema = existingType
      ? (contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]
        ?.json_schema as JSONSchema6 | undefined)
      : undefined
    sourceSequence.current += 1
    const sourceId = createSourceId(typeSlug, sourceSequence.current, sourceConfig.key)
    const headers = parsed.headers.map((header) => header.key)
    const inferredMapping = inferCSVImportMapping(headers)
    const mapping = sourceConfig.mapping === 'assumed'
      ? { ...inferredMapping, dataColumns: headers }
      : inferredMapping
    const mappingSchema = sourceConfig.arrayTarget
      ? getCSVArrayItemSchema(existingSchema, sourceConfig.arrayTarget.arrayFieldPath)
      : existingSchema
    mapping.fieldMappings = inferCSVSchemaFieldMappings(mapping.dataColumns ?? [], mappingSchema)
    const adapter = createCSVImportAdapter({
      id: sourceId,
      label: csvFileNameToTypeLabel(fileName),
      text: fileData,
      mapping,
      relationshipFields: sourceConfig.relationshipFields ?? [],
      relationshipRules: viewConfig.relationshipRules,
      arrayTarget: sourceConfig.arrayTarget,
      sourceKey: sourceConfig.key,
      schema: sourceConfig.arrayTarget
        ? getCSVArrayItemSchema(existingSchema, sourceConfig.arrayTarget.arrayFieldPath)
        : existingSchema,
    })
    const source = {
      sourceId,
      config: sourceConfig,
      typeSlug,
      selectedObjectTypeUuid: existingType?.uuid,
      fileName,
      fileText: fileData,
      parsed,
      mapping,
      relationshipFields: sourceConfig.relationshipFields ?? [],
      relationshipRule: undefined,
      adapter,
      startAtImport: false,
    }
    setSources((current) => [
      ...current.filter(
        (existing) => !configuredSource || existing.config.key !== configuredSource.key
      ),
      source,
    ])
    setActiveSourceId(sourceId)
    const uploadedKeys = new Set([
      ...sources.map((existing) => existing.config.key),
      sourceConfig.key,
    ])
    if (
      viewConfig.sourceConfigs?.length &&
      viewConfig.sourceConfigs.every((configured) => uploadedKeys.has(configured.key))
    ) {
      setActiveWizardStep('mapping')
    }
    if (!uploadMultipleFiles && !(viewConfig.sourceConfigs && viewConfig.sourceConfigs.length > 0)) {
      setActiveWizardStep('mapping')
    }
    setUploadKey((key) => key + 1)
  }

  const updateSource = (sourceId: string, update: Partial<CSVImportSource>) => {
    setSources((current) =>
      current.map((source) => (source.sourceId === sourceId ? { ...source, ...update } : source))
    )
  }

  const continueToRecords = async () => {
    if (!activeSource) return
    setIsLoadingRecords(true)
    setLoadError(undefined)
    try {
      if (viewConfig.sourceConfigs?.some((sourceConfig) => sourceConfig.arrayTarget)) {
        const parentSource = configuredParentSource
        if (!parentSource) throw new Error('A parent CSV source is required.')
        const controller = new AbortController()
        const loadedSources = await Promise.all(
          sources.map(async (source) => {
            const candidates = await source.adapter.discover({
              url: source.adapter.defaultImportUrl,
              signal: controller.signal,
            })
            const records = await Promise.all(
              candidates.map((candidate) => source.adapter.load({ candidate }))
            )
            return { source, candidates, records }
          })
        )
        const parentLoaded = loadedSources.find(
          (loaded) => loaded.source.sourceId === parentSource.sourceId
        )
        if (!parentLoaded) throw new Error('The parent CSV source could not be loaded.')

        let mergedRecords = parentLoaded.records
        for (const loaded of loadedSources) {
          const target = loaded.source.config.arrayTarget
          if (!target) continue
          const merged = mergeArraySourceRecordsIntoParentRecords({
            parentRecords: mergedRecords,
            arrayRecords: loaded.records,
            target,
          })
          if (merged.unmatchedArrayRecords.length > 0) {
            throw new Error(
              `${merged.unmatchedArrayRecords.length} array rows did not match a parent record.`
            )
          }
          mergedRecords = merged.records
        }

        parentSession.resetSession()
        parentSession.setCandidates(parentLoaded.candidates)
        parentSession.setRecords(mergedRecords)
        const existingType = parentSource.selectedObjectTypeUuid
          ? contextState.object_type_by_uuid[parentSource.selectedObjectTypeUuid]
          : contextState.object_type_by_slug[parentSource.typeSlug]
        const existingSchema = existingType
          ? contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]?.json_schema
          : undefined
        if (existingType && existingSchema) {
          parentSession.setSelectedObjectType(existingType)
          parentSession.setSchema(existingSchema)
          parentSession.setValidationResults(
            mergedRecords.map((record) => {
              const errors = schemaToFormUtils.validateAgainstSchema(
                omit(existingSchema as Record<string, unknown>, '$schema'),
                record.data as IFormValues
              )
              return {
                record,
                result: {
                  isValid: !errors?.length,
                  errors: errors?.map((error) => error.message) ?? [],
                },
              }
            })
          )
        }
        setActiveSourceId(parentSource.sourceId)
        updateSource(parentSource.sourceId, { startAtImport: Boolean(existingType && existingSchema) })
        setStep('records')
        setActiveWizardStep('import')
        return
      }
      activeSession.resetSession()
      const candidates = await activeSource.adapter.discover({
        url: activeSource.adapter.defaultImportUrl,
        signal: new AbortController().signal,
      })
      activeSession.setCandidates(candidates)
      const records = await Promise.all(
        candidates.map((candidate) => activeSource.adapter.load({ candidate }))
      )
      activeSession.setRecords(records)
      const existingType = activeSource.selectedObjectTypeUuid
        ? contextState.object_type_by_uuid[activeSource.selectedObjectTypeUuid]
        : contextState.object_type_by_slug[activeSource.typeSlug]
      const existingSchema = existingType
        ? contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]?.json_schema
        : undefined
      const mappingComplete = isCSVImportMappingComplete(
        activeSource.parsed.headers.map((header) => header.key),
        activeSource.mapping
      )
      const canStartAtImport = Boolean(
        !activeSource.config.arrayTarget && existingType && existingSchema && mappingComplete
      )
      if (canStartAtImport && existingType && existingSchema) {
        activeSession.setSelectedObjectType(existingType)
        activeSession.setSchema(existingSchema)
        activeSession.setValidationResults(
          records.map((record) => {
            const errors = schemaToFormUtils.validateAgainstSchema(
              omit(existingSchema as Record<string, unknown>, '$schema'),
              record.data as IFormValues
            )
            return {
              record,
              result: {
                isValid: !errors?.length,
                errors: errors?.map((error) => error.message) ?? [],
              },
            }
          })
        )
      }
      updateSource(activeSource.sourceId, { startAtImport: canStartAtImport })
      setStep('records')
      setActiveWizardStep('import')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <ImportWizard
        activeStep={activeWizardStep}
        onStepChange={(nextStep) => {
          const next = nextStep as typeof activeWizardStep
          if (next === 'import' && step !== 'records') return
          if (next === 'mapping' && !activeSource) return
          setActiveWizardStep(next)
        }}
        steps={[
          {
            id: 'upload',
            label: 'Upload files',
            completed: sources.length > 0,
          },
          {
            id: 'mapping',
            label: 'Map fields',
            completed: step === 'records',
          },
          {
            id: 'import',
            label: 'Import records',
            disabled: step !== 'records',
          },
        ]}
      />
      {activeWizardStep === 'upload' && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto">
          <section className="border-b pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Import CSV files</h1>
                <p className="text-sm text-gray-600">
                  {sourceCountLabel}. Each file keeps its own mapping and import session.
                </p>
              </div>
              <FileSpreadsheet size={22} />
            </div>
            {viewConfig.sourceConfigs && viewConfig.sourceConfigs.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {viewConfig.sourceConfigs.map((sourceConfig) => {
                  const uploadedSource = sources.find(
                    (source) => source.config.key === sourceConfig.key
                  )
                  return (
                    <section key={sourceConfig.key} className="border p-3" aria-label={sourceConfig.label}>
                      <h2 className="font-semibold">{sourceConfig.label}</h2>
                      {sourceConfig.description && (
                        <p className="mb-3 text-sm text-gray-600">{sourceConfig.description}</p>
                      )}
                      <FileUpload
                        key={`${uploadKey}-${sourceConfig.key}`}
                        field={{
                          ...csvField,
                          id: `csv-file-${sourceConfig.key}`,
                          label: `Upload ${sourceConfig.label}`,
                          description: sourceConfig.description ?? csvField.description,
                        }}
                        value={null}
                        onChange={() => undefined}
                        acceptFileTypes={['csv', 'text/csv']}
                        onFileUploaded={(fileData, csvData, uploadedFileName) => {
                          if (typeof fileData === 'string' && csvData && uploadedFileName)
                            addSource(fileData, csvData, uploadedFileName, sourceConfig)
                        }}
                      />
                      {uploadedSource && (
                        <p className="mt-2 text-xs text-green-700">
                          Using {uploadedSource.fileName} for this source.
                        </p>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : (
              <>
                <FileUpload
                  key={uploadKey}
                  field={csvField}
                  value={null}
                  onChange={() => undefined}
                  acceptFileTypes={['csv', 'text/csv']}
                  onFileUploaded={(fileData, csvData, uploadedFileName) => {
                    if (typeof fileData === 'string' && csvData && uploadedFileName)
                      addSource(fileData, csvData, uploadedFileName)
                  }}
                />
                <label className="mt-3 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uploadMultipleFiles}
                    onChange={(event) => setUploadMultipleFiles(event.target.checked)}
                  />
                  Upload multiple files in this session
                </label>
              </>
            )}
          </section>

          {sources.length > 0 && (
            <section className="border-b pb-4" aria-label="CSV sources">
              <h2 className="mb-2 font-semibold">CSV sources</h2>
              <div className="flex flex-col gap-2">
                {sources.map((source) => (
                  <div key={source.sourceId} className="flex items-center gap-2 border px-3 py-2">
                    <Button
                      size="xs"
                      variant={activeSourceId === source.sourceId ? 'default' : 'outline'}
                      onClick={() => setActiveSourceId(source.sourceId)}
                    >
                      {source.fileName}
                    </Button>
                    <span className="text-xs text-gray-600">
                      {source.parsed.data.length} rows, type {source.typeSlug}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      className="ml-auto"
                      aria-label={`Remove ${source.fileName}`}
                      onClick={() => {
                        const remaining = sources.filter(
                          ({ sourceId }) => sourceId !== source.sourceId
                        )
                        setSources(remaining)
                        if (activeSourceId === source.sourceId)
                          setActiveSourceId(remaining[0]?.sourceId ?? null)
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loadError && (
            <div className="text-sm text-red-700" role="alert">
              Could not load CSV records: {loadError}
            </div>
          )}
        </div>
      )}

      {activeWizardStep === 'mapping' && activeSource && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">{activeSource.fileName}</h1>
              <span className="text-sm text-gray-600">
                {activeSource.parsed.data.length} records, {sources.length} source{sources.length === 1 ? '' : 's'}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setActiveWizardStep('upload')}>
              Back to upload
            </Button>
          </div>
          {activeWizardStep === 'mapping' && sources.length > 1 && (
            <section className="border-b pb-4" aria-label="Uploaded CSV files">
              <h2 className="mb-2 font-semibold">Uploaded CSV files</h2>
              <div className="flex flex-col gap-2">
                {sources.map((source) => (
                  <details
                    key={source.sourceId}
                    className="border px-3 py-2"
                    open={source.sourceId === activeSource.sourceId}
                    onToggle={(event) => {
                      if (event.currentTarget.open) setActiveSourceId(source.sourceId)
                    }}
                  >
                    <summary className="cursor-pointer bg-slate-800 px-3 py-2 text-base font-semibold text-white">
                      {source.fileName} · {source.parsed.data.length} rows ·{' '}
                      {source.parsed.headers.length} columns
                    </summary>
                    <div className="mt-3 border-t pt-3">
                      <CSVSourceEditor
                        source={source}
                        sources={sources}
                        mode="mapping"
                        viewConfig={viewConfig}
                        onChange={(update) => updateSource(source.sourceId, update)}
                      />
                      <CSVSourceEditor
                        source={source}
                        sources={sources}
                        mode="relationships"
                        viewConfig={viewConfig}
                        onChange={(update) => updateSource(source.sourceId, update)}
                      />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
          {sources.length === 1 ? (
            <>
              <CSVSourceEditor
                source={activeSource}
                sources={sources}
                mode="mapping"
                viewConfig={viewConfig}
                onChange={(update) => updateSource(activeSource.sourceId, update)}
              />
              <CSVSourceEditor
                source={activeSource}
                sources={sources}
                mode="relationships"
                viewConfig={viewConfig}
                onChange={(update) => updateSource(activeSource.sourceId, update)}
              />
            </>
          ) : null}
          {activeWizardStep === 'mapping' && (
            <div className="flex justify-end border-t pt-4">
              <Button
                disabled={isLoadingRecords}
                onClick={() => {
                  void continueToRecords()
                }}
              >
                Continue to import
                <FileSpreadsheet size={16} />
              </Button>
            </div>
          )}
          {loadError && (
            <div className="text-sm text-red-700" role="alert">
              Could not load CSV records: {loadError}
            </div>
          )}
        </div>
      )}

      {activeWizardStep === 'import' && activeSource && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">Import {activeSource.fileName}</h1>
              <span className="text-sm text-gray-600">
                {activeSource.parsed.data.length} records loaded
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setActiveWizardStep('upload')}>
              Back to CSV sources
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ImportRecordsPage
              key={`${activeSource.adapter.id}-${activeSource.parsed.data.length}`}
              type={activeSource.sourceId}
              objectTypeSlug={activeSource.typeSlug}
              label={csvFileNameToTypeLabel(activeSource.fileName)}
              pluralLabel="CSV records"
              sourceAdapter={activeSource.adapter}
              csvSource
              arraySource={Boolean(activeSource.config.arrayTarget)}
              startAtImport={activeSource.startAtImport}
              icon={FileSpreadsheet}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVImportPage
