import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
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
import {
  formatCSVRecordsError,
  getCSVDocumentSourcesInDependencyOrder,
  getCSVSourceExecutionDependencies,
  mergeCSVArraySources,
} from '../csv_orchestration'
import type {
  CanonicalImportRecord,
  ImportCandidate,
  ImportArraySourceTarget,
  ImportRelationshipRule,
  ImportSourceAdapter,
} from '../types'
import type { IObjectType } from '@/types/types'
import { fetchExistingImportDocuments } from '../reconciliation_service'
import { getDocumentImportProvenance } from '../reconciliation'
import {
  persistImportRelationships,
  planImportRelationships,
  relationshipDocumentKey,
  type ImportRelationshipPersistenceResult,
  type ImportRelationshipPlan,
} from '../relationship_planning'
import ImportRecordsPage from './index'
import { Button } from '@/components/ui/button'
import { useImportSession } from '../state/importState'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import { omit } from 'lodash-es'
import { uploadedImportSourcesAtom } from '../state/uploadedImportSources'
import {
  clearCSVRelationshipRule,
  getUniqueCSVRelationshipRules,
  mirrorCSVRelationshipRule,
} from '../csv_relationships'
import { updateCSVImportSource } from '../csv_import_source_state'
import { ImportWizard } from '../components/import_wizard'
import { fetchRelationships, postRelationship } from '@/manage/relationship/services'
import { useAuth } from '@/auth/useAuth'

const csvField = {
  id: 'csv-file',
  label: 'CSV file',
  description: 'Upload CSV files to preview and import them as independent sources.',
} as IFieldInputProps['field']

type CSVImportSource = {
  sourceId: string
  config: CSVImportSourceConfig
  role: CSVImportSourceRole
  arrayTarget?: ImportArraySourceTarget
  typeSlug: string
  selectedObjectTypeUuid?: string
  fileName: string
  fileText: string
  entryChoiceValue?: string
  parsed: ParsedCSV
  mapping: CSVImportMapping
  relationshipFields: string[]
  relationshipRule?: ImportRelationshipRule
  adapter: ImportSourceAdapter
  startAtImport: boolean
}

export type CSVImportSourceRole = 'standalone' | 'parent' | 'child' | 'array'

export type CSVImportSourceConfig = {
  key: string
  label: string
  description?: string
  fileName?: string
  typeSlug: string
  typeKnown: boolean
  mapping: 'required' | 'assumed'
  role?: CSVImportSourceRole
  relationshipFields?: string[]
  entryChoiceKey?: string
  entryChoiceSchemaPath?: string
  entryChoiceFieldPath?: string
  arrayTarget?: ImportArraySourceTarget
}

export type CSVImportEntryChoice = {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
}

export type CSVImportViewConfig = {
  mapping: 'required' | 'assumed'
  relationships: 'user-configured' | 'fixed'
  knownObjectTypeSlug?: string
  relationshipFields?: string[]
  relationshipRules?: ImportRelationshipRule[]
  sourceConfigs?: CSVImportSourceConfig[]
  entryChoices?: CSVImportEntryChoice[]
}

const getCSVSourceBranchSelections = (
  source: Pick<CSVImportSource, 'config' | 'entryChoiceValue'>
): Record<string, string> =>
  source.config.entryChoiceSchemaPath && source.entryChoiceValue
    ? { [source.config.entryChoiceSchemaPath]: source.entryChoiceValue }
    : {}

const getCSVSourceFixedFields = (
  source: Pick<CSVImportSource, 'config' | 'entryChoiceValue'>
): Record<string, unknown> =>
  source.config.entryChoiceFieldPath && source.entryChoiceValue
    ? { [source.config.entryChoiceFieldPath]: source.entryChoiceValue }
    : {}

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
    (sourceConfig) => sourceConfig.fileName === fileName || sourceConfig.typeSlug === fileTypeSlug
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

const resolveCSVImportSourceRole = (
  viewConfig: CSVImportViewConfig,
  sourceConfig: CSVImportSourceConfig
): CSVImportSourceRole => {
  if (sourceConfig.role) return sourceConfig.role
  if (sourceConfig.arrayTarget) return 'array'
  if (
    viewConfig.sourceConfigs?.some(
      (candidate) => candidate.arrayTarget?.parentSourceKey === sourceConfig.key
    )
  )
    return 'parent'
  return 'standalone'
}

const createSourceId = (typeSlug: string, sourceNumber: number, sourceKey?: string): string =>
  `${sourceKey ?? typeSlug}-${sourceNumber}`

const SchemaFieldOptionView = ({ title, path, required }: ISelectOptionProps): ReactElement => (
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
  const mappingSchema = source.arrayTarget
    ? getCSVArrayItemSchema(selectedSchema, source.arrayTarget.arrayFieldPath)
    : selectedSchema
  const fixedFieldPaths = new Set(Object.keys(getCSVSourceFixedFields(source)))
  const schemaFields = getCSVSchemaFields(
    mappingSchema,
    '',
    getCSVSourceBranchSelections(source)
  ).filter(({ path }) => !fixedFieldPaths.has(path))

  const rebuildAdapter = (
    mapping: CSVImportMapping,
    relationshipFields: string[],
    relationshipRule?: ImportRelationshipRule,
    arrayTarget = source.arrayTarget
  ) => {
    const roleField = relationshipRule
      ? source.role === 'parent'
        ? relationshipRule.parentMatchField
        : source.role === 'child'
          ? relationshipRule.childMatchField
          : undefined
      : undefined
    const preservedRelationshipFields =
      roleField && !relationshipFields.includes(roleField)
        ? [...relationshipFields, roleField]
        : relationshipFields
    return createCSVImportAdapter({
      id: source.sourceId,
      label: csvFileNameToTypeLabel(source.fileName),
      text: source.fileText,
      mapping,
      relationshipFields: preservedRelationshipFields,
      relationshipRules:
        viewConfig.relationships === 'fixed'
          ? viewConfig.relationshipRules
          : relationshipRule
            ? [relationshipRule]
            : undefined,
      arrayTarget,
      fixedFields: getCSVSourceFixedFields(source),
      fieldMappings: source.arrayTarget ? undefined : selectedObjectType?.data?.field_mappings,
      sourceKey: source.config.key,
      schema: arrayTarget
        ? getCSVArrayItemSchema(selectedSchema, arrayTarget.arrayFieldPath)
        : selectedSchema,
    })
  }

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

      {mode === 'relationships' && (
        <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV source role">
          <div className="mb-3">
            <h2 className="font-semibold">Source role</h2>
            <p className="text-sm text-gray-600">
              Choose how this uploaded file participates in the import session.
            </p>
          </div>
          <select
            value={source.role}
            disabled={viewConfig.relationships === 'fixed'}
            onChange={(event) => {
              const role = event.target.value as CSVImportSourceRole
              const arrayTarget = role === 'array' ? source.arrayTarget : undefined
              const relationshipRule = role === 'child' ? source.relationshipRule : undefined
              onChange({
                role,
                arrayTarget,
                relationshipRule,
                adapter: rebuildAdapter(
                  source.mapping,
                  source.relationshipFields,
                  relationshipRule,
                  arrayTarget
                ),
                startAtImport: false,
              })
            }}
            className="border px-2 py-1"
          >
            <option value="standalone">Standalone documents</option>
            <option value="parent">Parent documents</option>
            <option value="child">Child documents</option>
            <option value="array">Array items on a parent</option>
          </select>
        </section>
      )}

      {mode === 'relationships' && (
        <section
          className="min-w-0 shrink-0 border-b pb-6 mb-4"
          aria-label="CSV relationship fields"
        >
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
                  {rule.childObjectTypeSlug} ({rule.childMatchField ?? 'identity'}) ·{' '}
                  {rule.predicate}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
            </div>
          )}
        </section>
      )}

      {mode === 'relationships' &&
        viewConfig.relationships === 'user-configured' &&
        (source.role === 'parent' || source.role === 'child') && (
          <section
            className="min-w-0 shrink-0 border-b pb-6 mb-4"
            aria-label="CSV relationship rule"
          >
            <div className="mb-3">
              <h2 className="font-semibold">Relationship rule</h2>
              <p className="text-sm text-gray-600">Connect this CSV to another uploaded source.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {source.role === 'parent' ? 'Child CSV' : 'Parent CSV'}
                </span>
                <select
                  value={
                    source.role === 'parent'
                      ? (source.relationshipRule?.childObjectTypeSlug ?? '')
                      : (source.relationshipRule?.parentObjectTypeSlug ?? '')
                  }
                  onChange={(event) => {
                    const related = sources.find(
                      (candidate) => candidate.typeSlug === event.target.value
                    )
                    const relationshipRule = related
                      ? {
                        parentObjectTypeSlug:
                          source.role === 'parent' ? source.typeSlug : related.typeSlug,
                        childObjectTypeSlug:
                          source.role === 'parent' ? related.typeSlug : source.typeSlug,
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
                    .filter((candidate) => source.role === 'parent' || candidate.role === 'parent')
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
                      {(source.role === 'parent'
                        ? source.parsed.headers
                        : (sources.find(
                          (candidate) =>
                            candidate.typeSlug === source.relationshipRule?.parentObjectTypeSlug
                        )?.parsed.headers ?? [])
                      ).map((header) => (
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
                      {(source.role === 'parent'
                        ? (sources.find(
                          (candidate) =>
                            candidate.typeSlug === source.relationshipRule?.childObjectTypeSlug
                        )?.parsed.headers ?? [])
                        : source.parsed.headers
                      ).map((header) => (
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
          </section>
        )}

      {mode === 'relationships' &&
        viewConfig.relationships === 'user-configured' &&
        source.role === 'array' && (
          <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV array target">
            <div className="mb-3">
              <h2 className="font-semibold">Array target</h2>
              <p className="text-sm text-gray-600">
                Each row in this file becomes an item in an existing parent document array.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Parent CSV</span>
                <select
                  value={source.arrayTarget?.parentSourceKey ?? ''}
                  onChange={(event) => {
                    const parent = sources.find(
                      (candidate) => candidate.config.key === event.target.value
                    )
                    const arrayTarget = {
                      parentSourceKey: event.target.value,
                      arrayFieldPath: source.arrayTarget?.arrayFieldPath ?? '',
                      parentMatchField: source.arrayTarget?.parentMatchField ?? '',
                      rowMatchField: source.arrayTarget?.rowMatchField ?? '',
                    }
                    onChange({
                      arrayTarget,
                      typeSlug: parent?.typeSlug ?? source.typeSlug,
                      selectedObjectTypeUuid:
                        parent?.selectedObjectTypeUuid ?? source.selectedObjectTypeUuid,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        undefined,
                        arrayTarget
                      ),
                      startAtImport: false,
                    })
                  }}
                  className="border px-2 py-1"
                >
                  <option value="">Select a parent source</option>
                  {sources
                    .filter((candidate) => candidate.role === 'parent')
                    .map((candidate) => (
                      <option key={candidate.sourceId} value={candidate.config.key}>
                        {candidate.fileName}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Array field path</span>
                <input
                  value={source.arrayTarget?.arrayFieldPath ?? ''}
                  onChange={(event) => {
                    const arrayTarget = {
                      ...(source.arrayTarget ?? {
                        parentSourceKey: '',
                        parentMatchField: '',
                        rowMatchField: '',
                      }),
                      arrayFieldPath: event.target.value,
                    }
                    onChange({
                      arrayTarget,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        undefined,
                        arrayTarget
                      ),
                      startAtImport: false,
                    })
                  }}
                  placeholder="contacts"
                  className="border px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Parent match field</span>
                <select
                  value={source.arrayTarget?.parentMatchField ?? ''}
                  onChange={(event) => {
                    const arrayTarget = {
                      ...source.arrayTarget!,
                      parentMatchField: event.target.value,
                    }
                    onChange({
                      arrayTarget,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        undefined,
                        arrayTarget
                      ),
                      startAtImport: false,
                    })
                  }}
                  className="border px-2 py-1"
                >
                  <option value="">Select a field</option>
                  {(
                    sources.find(
                      (candidate) => candidate.config.key === source.arrayTarget?.parentSourceKey
                    )?.parsed.headers ?? []
                  ).map((header) => (
                    <option key={header.key} value={header.key}>
                      {header.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Row match field</span>
                <select
                  value={source.arrayTarget?.rowMatchField ?? ''}
                  onChange={(event) => {
                    const arrayTarget = {
                      ...source.arrayTarget!,
                      rowMatchField: event.target.value,
                    }
                    onChange({
                      arrayTarget,
                      adapter: rebuildAdapter(
                        source.mapping,
                        source.relationshipFields,
                        undefined,
                        arrayTarget
                      ),
                      startAtImport: false,
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
            </div>
          </section>
        )}

      {mode === 'mapping' && (
        <section className="min-w-0 shrink-0 border-b pb-6 mb-4" aria-label="CSV field mapping">
          <div className="mb-3">
            <h2 className="font-semibold">Map CSV fields</h2>
            <p className="text-sm text-gray-600">
              Choose each column&apos;s document role, whether it is included as data, and its
              schema field when a type is selected.
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
                  const specialField = (
                    ['label', 'slug', 'externalId', 'description'] as const
                  ).find((field) => source.mapping[field] === header.key)
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
                            <span className="block text-xs font-normal text-gray-500">
                              {header.type}
                            </span>
                          </span>
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={specialField ?? (included ? 'data' : 'ignore')}
                          onChange={(event) =>
                            updateColumn(event.target.value as Parameters<typeof updateColumn>[0])
                          }
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
        </section>
      )}
    </>
  )
}

const CSVSourceImportPanel = ({
  source,
  loaded,
  onObjectTypeSelected,
  executionBlocked,
  executionBlockMessage,
  onImportAttemptComplete,
}: {
  source: CSVImportSource
  loaded?: { candidates: ImportCandidate[]; records: CanonicalImportRecord[] }
  onObjectTypeSelected: (sourceId: string, objectType: IObjectType | undefined) => void
  executionBlocked: boolean
  executionBlockMessage?: string
  onImportAttemptComplete: (sourceId: string) => void
}): ReactElement => {
  const { session, setCandidates, setRecords } = useImportSession(source.sourceId)
  const handlePanelObjectTypeSelected = useCallback(
    (objectType: IObjectType | undefined) => onObjectTypeSelected(source.sourceId, objectType),
    [onObjectTypeSelected, source.sourceId]
  )
  const handleImportAttemptComplete = useCallback(
    () => onImportAttemptComplete(source.sourceId),
    [onImportAttemptComplete, source.sourceId]
  )

  useEffect(() => {
    if (!loaded) return
    const sessionMatchesLoadedRecords =
      session.records.length === loaded.records.length &&
      session.records[0]?.provenance.externalId === loaded.records[0]?.provenance.externalId
    if (sessionMatchesLoadedRecords) return
    setCandidates(loaded.candidates)
    setRecords(loaded.records)
  }, [loaded, session.records, setCandidates, setRecords])

  useEffect(() => {
    if (!loaded || loaded.records.length > 0 || executionBlocked) return
    onImportAttemptComplete(source.sourceId)
  }, [executionBlocked, loaded, onImportAttemptComplete, source.sourceId])

  if (!loaded) {
    return <div className="border p-3 text-sm text-gray-600">Records are still loading.</div>
  }

  return (
    <section className="flex min-h-[28rem] min-w-0 flex-col border p-3">
      <h2 className="mb-2 font-semibold">{source.fileName}</h2>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ImportRecordsPage
          key={`${source.adapter.id}-${loaded.records.length}`}
          type={source.sourceId}
          objectTypeSlug={source.typeSlug}
          label={csvFileNameToTypeLabel(source.fileName)}
          pluralLabel="CSV records"
          sourceAdapter={source.adapter}
          csvSource
          arraySource={Boolean(source.arrayTarget)}
          executionBlocked={executionBlocked}
          executionBlockMessage={executionBlockMessage}
          onImportAttemptComplete={handleImportAttemptComplete}
          onObjectTypeSelected={handlePanelObjectTypeSelected}
          icon={FileSpreadsheet}
        />
      </div>
    </section>
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
  const [activeWizardStep, setActiveWizardStep] = useState<'upload' | 'mapping' | 'import'>(
    'upload'
  )
  const [uploadMultipleFiles, setUploadMultipleFiles] = useState(false)
  const [entryChoiceValues, setEntryChoiceValues] = useState<Record<string, string>>({})
  const [uploadKey, setUploadKey] = useState(0)
  const sourceSequence = useRef(0)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [loadedSourceRecords, setLoadedSourceRecords] = useState<
    Record<string, { candidates: ImportCandidate[]; records: CanonicalImportRecord[] }>
  >({})
  const [completedSourceIds, setCompletedSourceIds] = useState<Set<string>>(() => new Set())
  const [relationshipResults, setRelationshipResults] = useState<
    ImportRelationshipPersistenceResult[]
  >([])
  const [isLinkingRelationships, setIsLinkingRelationships] = useState(false)
  const [relationshipError, setRelationshipError] = useState<string>()
  const [contextState] = useAtom(contextStateAtom)
  const auth = useAuth()
  const [, setUploadedImportSources] = useAtom(uploadedImportSourcesAtom)
  const activeSource = sources.find((source) => source.sourceId === activeSourceId) ?? null
  const activeSession = useImportSession(activeSource?.sourceId ?? 'csv-upload')
  const configuredParentSource = sources.find((source) => source.role === 'parent')
  const parentSession = useImportSession(
    configuredParentSource?.sourceId ?? 'csv-configured-parent'
  )
  const sourceCountLabel = useMemo(
    () => `${sources.length} CSV source${sources.length === 1 ? '' : 's'}`,
    [sources.length]
  )
  const documentSourcesInDependencyOrder = useMemo(
    () => getCSVDocumentSourcesInDependencyOrder(sources),
    [sources]
  )
  const executionDependencies = useMemo(() => {
    return new Map(
      documentSourcesInDependencyOrder.map((source) => [
        source.sourceId,
        getCSVSourceExecutionDependencies(source, sources, documentSourcesInDependencyOrder),
      ])
    )
  }, [documentSourcesInDependencyOrder, sources])
  const markSourceImportAttemptComplete = useCallback((sourceId: string) => {
    setCompletedSourceIds((current) => {
      if (current.has(sourceId)) return current
      return new Set(current).add(sourceId)
    })
  }, [])

  const handleObjectTypeSelected = useCallback(
    (sourceId: string, objectType: IObjectType | undefined) => {
      setCompletedSourceIds(new Set())
      setSources((current) =>
        current.map((source) => {
          if (source.sourceId !== sourceId) return source
          if (
            source.selectedObjectTypeUuid === objectType?.uuid &&
            source.typeSlug === objectType?.slug
          )
            return source
          const typeSlug = objectType?.slug ?? source.typeSlug
          const selectedType = objectType ?? contextState.object_type_by_slug[typeSlug]
          const selectedSchema = selectedType
            ? (contextState.object_schema_defaults_by_object_type_uuid[selectedType.uuid]
              ?.json_schema as JSONSchema6 | undefined)
            : undefined
          const schema = source.arrayTarget
            ? getCSVArrayItemSchema(selectedSchema, source.arrayTarget.arrayFieldPath)
            : selectedSchema
          return {
            ...source,
            selectedObjectTypeUuid: objectType?.uuid,
            typeSlug,
            adapter: createCSVImportAdapter({
              id: source.sourceId,
              label: csvFileNameToTypeLabel(source.fileName),
              text: source.fileText,
              mapping: source.mapping,
              relationshipFields: source.relationshipFields,
              relationshipRules:
                viewConfig.relationships === 'fixed'
                  ? viewConfig.relationshipRules
                  : source.relationshipRule
                    ? [source.relationshipRule]
                    : undefined,
              arrayTarget: source.arrayTarget,
              fixedFields: getCSVSourceFixedFields(source),
              fieldMappings: source.arrayTarget ? undefined : selectedType?.data?.field_mappings,
              sourceKey: source.config.key,
              schema,
            }),
            startAtImport: false,
          }
        })
      )
    },
    [contextState, viewConfig]
  )
  const onActiveObjectTypeSelected = useCallback(
    (objectType: IObjectType | undefined) => {
      if (activeSourceId) handleObjectTypeSelected(activeSourceId, objectType)
    },
    [activeSourceId, handleObjectTypeSelected]
  )

  const csvRelationshipPlans = useMemo<ImportRelationshipPlan[]>(() => {
    const objectTypes = new Map<string, IObjectType>(
      sources
        .map((source) => {
          const objectType = source.selectedObjectTypeUuid
            ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
            : contextState.object_type_by_slug[source.typeSlug]
          return objectType ? ([objectType.uuid, objectType] as const) : undefined
        })
        .filter((entry): entry is readonly [string, IObjectType] => Boolean(entry))
    )
    const candidates = sources.flatMap((source) => {
      const objectType = source.selectedObjectTypeUuid
        ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
        : contextState.object_type_by_slug[source.typeSlug]
      const records = loadedSourceRecords[source.sourceId]?.records ?? []
      return objectType
        ? records.map((record) => ({
          record,
          objectTypeUuid: objectType.uuid,
          objectTypeSlug: objectType.slug,
        }))
        : []
    })
    const relationshipRules = sources
      .flatMap((source) => {
        const objectType = source.selectedObjectTypeUuid
          ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
          : contextState.object_type_by_slug[source.typeSlug]
        const configuredRules = source.relationshipRule
          ? [source.relationshipRule]
          : (source.adapter.relationshipRules ?? [])
        return configuredRules.map((rule) => ({
          ...rule,
          parentObjectTypeSlug: (() => {
            const parentSource =
              source.role === 'parent'
                ? source
                : sources.find(
                  (candidate) =>
                    candidate.role === 'parent' &&
                    candidate.typeSlug === rule.parentObjectTypeSlug
                )
            const parentType = parentSource?.selectedObjectTypeUuid
              ? contextState.object_type_by_uuid[parentSource.selectedObjectTypeUuid]
              : parentSource
                ? contextState.object_type_by_slug[parentSource.typeSlug]
                : undefined
            return (
              parentType?.slug ??
              (source.role === 'parent' && objectType ? objectType.slug : rule.parentObjectTypeSlug)
            )
          })(),
          childObjectTypeSlug: (() => {
            const childSource =
              source.role === 'child'
                ? source
                : sources.find(
                  (candidate) =>
                    candidate.role === 'child' && candidate.typeSlug === rule.childObjectTypeSlug
                )
            const childType = childSource?.selectedObjectTypeUuid
              ? contextState.object_type_by_uuid[childSource.selectedObjectTypeUuid]
              : childSource
                ? contextState.object_type_by_slug[childSource.typeSlug]
                : undefined
            return (
              childType?.slug ??
              (source.role === 'child' && objectType ? objectType.slug : rule.childObjectTypeSlug)
            )
          })(),
        }))
      })
      .filter(
        (rule, index, allRules) =>
          allRules.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(rule)) ===
          index
      )

    return planImportRelationships({
      parentObjectTypes: objectTypes,
      candidates,
      relationshipRules,
    })
  }, [
    contextState.object_type,
    contextState.object_type_by_slug,
    contextState.object_type_by_uuid,
    loadedSourceRecords,
    sources,
  ])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.groupCollapsed('[CSV relationship planner] updated')
    console.table(
      sources.map((source) => ({
        file: source.fileName,
        role: source.role,
        typeSlug: source.typeSlug,
        selectedTypeUuid: source.selectedObjectTypeUuid ?? '',
        recordsLoaded: loadedSourceRecords[source.sourceId]?.records.length ?? 0,
      }))
    )
    console.log('rules', sources.map((source) => source.relationshipRule).filter(Boolean))
    console.table(
      csvRelationshipPlans.map((plan) => ({
        parent: plan.parent?.record.label ?? '',
        child: plan.child.record.label,
        predicate: plan.predicate,
        status: plan.status,
        reason: plan.reason ?? '',
      }))
    )
    console.groupEnd()
  }, [csvRelationshipPlans, loadedSourceRecords, sources])

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
    setCompletedSourceIds(new Set())
    const sourceConfig = configuredSource ?? resolveCSVImportSourceConfig(viewConfig, fileName)
    const entryChoiceValue = sourceConfig.entryChoiceKey
      ? entryChoiceValues[sourceConfig.entryChoiceKey]
      : undefined
    const choiceSource = { config: sourceConfig, entryChoiceValue }
    const role = resolveCSVImportSourceRole(viewConfig, sourceConfig)
    const typeSlug = sourceConfig.typeSlug
    const existingType = contextState.object_type_by_slug[typeSlug]
    const existingSchema = existingType
      ? (contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]?.json_schema as
        JSONSchema6 | undefined)
      : undefined
    sourceSequence.current += 1
    const sourceId = createSourceId(typeSlug, sourceSequence.current, sourceConfig.key)
    const headers = parsed.headers.map((header) => header.key)
    const inferredMapping = inferCSVImportMapping(headers)
    const mapping =
      sourceConfig.mapping === 'assumed'
        ? { ...inferredMapping, dataColumns: headers }
        : inferredMapping
    const mappingSchema = sourceConfig.arrayTarget
      ? getCSVArrayItemSchema(existingSchema, sourceConfig.arrayTarget.arrayFieldPath)
      : existingSchema
    mapping.fieldMappings = Object.fromEntries(
      Object.entries(inferCSVSchemaFieldMappings(
        mapping.dataColumns ?? [],
        mappingSchema,
        getCSVSourceBranchSelections(choiceSource)
      )).filter(([, fieldPath]) => fieldPath !== sourceConfig.entryChoiceFieldPath)
    )
    const adapter = createCSVImportAdapter({
      id: sourceId,
      label: csvFileNameToTypeLabel(fileName),
      text: fileData,
      mapping,
      relationshipFields: sourceConfig.relationshipFields ?? [],
      relationshipRules: viewConfig.relationshipRules,
      arrayTarget: sourceConfig.arrayTarget,
      fixedFields: getCSVSourceFixedFields(choiceSource),
      fieldMappings: sourceConfig.arrayTarget ? undefined : existingType?.data?.field_mappings,
      sourceKey: sourceConfig.key,
      schema: sourceConfig.arrayTarget
        ? getCSVArrayItemSchema(existingSchema, sourceConfig.arrayTarget.arrayFieldPath)
        : existingSchema,
    })
    const source = {
      sourceId,
      config: sourceConfig,
      role,
      arrayTarget: sourceConfig.arrayTarget,
      typeSlug,
      selectedObjectTypeUuid: existingType?.uuid,
      fileName,
      fileText: fileData,
      entryChoiceValue,
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
    if (
      !uploadMultipleFiles &&
      !(viewConfig.sourceConfigs && viewConfig.sourceConfigs.length > 0)
    ) {
      setActiveWizardStep('mapping')
    }
    setUploadKey((key) => key + 1)
  }

  const updateSource = (sourceId: string, update: Partial<CSVImportSource>) => {
    setCompletedSourceIds(new Set())
    setSources((current) => updateCSVImportSource(current, sourceId, update))
  }

  const updateRelationshipRule = (rule: ImportRelationshipRule) => {
    setCompletedSourceIds(new Set())
    setSources((current) =>
      mirrorCSVRelationshipRule(current, rule).map((source, index) => {
        if (source === current[index]) return source
        const matchField =
          source.role === 'parent'
            ? rule.parentMatchField
            : source.role === 'child'
              ? rule.childMatchField
              : undefined
        if (matchField === undefined) return source
        return {
          ...source,
          adapter: createCSVImportAdapter({
            id: source.sourceId,
            label: csvFileNameToTypeLabel(source.fileName),
            text: source.fileText,
            mapping: source.mapping,
            relationshipFields: source.relationshipFields,
            relationshipRules:
              viewConfig.relationships === 'fixed' ? viewConfig.relationshipRules : [rule],
            arrayTarget: source.arrayTarget,
            fixedFields: getCSVSourceFixedFields(source),
            fieldMappings: source.arrayTarget
              ? undefined
              : (source.selectedObjectTypeUuid
                ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
                : contextState.object_type_by_slug[source.typeSlug])?.data?.field_mappings,
            sourceKey: source.config.key,
            schema: source.adapter.schema,
          }),
        }
      })
    )
  }
  console.log('rules', getUniqueCSVRelationshipRules(sources))

  const continueToRecords = async () => {
    if (!activeSource) return
    setIsLoadingRecords(true)
    setLoadError(undefined)
    try {
      if (sources.some((source) => source.role === 'array')) {
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

        setLoadedSourceRecords(
          Object.fromEntries(
            loadedSources.map(({ source, candidates, records }) => [
              source.sourceId,
              { candidates, records },
            ])
          )
        )

        const mergedRecords = mergeCSVArraySources({
          parentSourceId: parentSource.sourceId,
          loadedSources,
        })

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
        updateSource(parentSource.sourceId, {
          startAtImport: Boolean(existingType && existingSchema),
        })
        setStep('records')
        setActiveWizardStep('import')
        return
      }
      const controller = new AbortController()
      const loadedSources =
        sources.length > 1
          ? await Promise.all(
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
          : []
      if (loadedSources.length > 0) {
        setLoadedSourceRecords(
          Object.fromEntries(
            loadedSources.map(({ source, candidates, records }) => [
              source.sourceId,
              { candidates, records },
            ])
          )
        )
      }
      const activeLoaded = loadedSources.find(
        (loaded) => loaded.source.sourceId === activeSource.sourceId
      )
      const candidates =
        activeLoaded?.candidates ??
        (await activeSource.adapter.discover({
          url: activeSource.adapter.defaultImportUrl,
          signal: controller.signal,
        }))
      const records =
        activeLoaded?.records ??
        (await Promise.all(candidates.map((candidate) => activeSource.adapter.load({ candidate }))))
      activeSession.resetSession()
      activeSession.setCandidates(candidates)
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
        !activeSource.arrayTarget && existingType && existingSchema && mappingComplete
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
      setLoadError(formatCSVRecordsError(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const linkCSVRelationships = async () => {
    setIsLinkingRelationships(true)
    setRelationshipError(undefined)
    try {
      const documentUuids = new Map<string, string>()
      for (const source of sources) {
        const objectType = source.selectedObjectTypeUuid
          ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
          : contextState.object_type_by_slug[source.typeSlug]
        const records = loadedSourceRecords[source.sourceId]?.records ?? []
        if (!objectType || records.length === 0) continue
        const documents = await fetchExistingImportDocuments({
          records,
          objectTypeUuid: objectType.uuid,
          token: auth.user?.access_token ?? '',
        })
        const documentsBySlug = new Map(documents.map((document) => [document.slug, document]))
        const documentsByExternalId = new Map(
          documents
            .map(
              (document) => [getDocumentImportProvenance(document)?.external_id, document] as const
            )
            .filter(([externalId]) => externalId !== undefined)
        )
        for (const record of records) {
          const document =
            documentsByExternalId.get(record.provenance.externalId) ??
            documentsBySlug.get(record.slug)
          if (document) {
            documentUuids.set(
              relationshipDocumentKey({
                record,
                objectTypeUuid: objectType.uuid,
                objectTypeSlug: objectType.slug,
              }),
              document.uuid
            )
          }
        }
      }
      const predicateUuids = new Map(
        [
          ...Object.values(contextState.predicate_by_predicate),
          ...Object.values(contextState.predicate_by_uuid),
        ].map((predicate) => [predicate.predicate, predicate.uuid])
      )
      if (import.meta.env.DEV) {
        console.log('[CSV relationship linker] resolved inputs', {
          documentUuids: [...documentUuids.entries()],
          predicateUuids: [...predicateUuids.entries()],
          plans: csvRelationshipPlans.length,
        })
      }
      const results = await persistImportRelationships({
        plans: csvRelationshipPlans,
        documentUuids,
        predicateUuids,
        signal: new AbortController().signal,
        post: async (relationship, signal) =>
          postRelationship({
            relationship,
            token: auth.user?.access_token ?? '',
            signal,
          }),
        findExisting: async (relationship, signal) =>
          (
            await fetchRelationships({
              token: auth.user?.access_token ?? '',
              signal,
              params: {
                limit: 1,
                filters: [
                  {
                    column: 'from_document_uuid',
                    operator: 'eq',
                    value: relationship.from_document_uuid,
                  },
                  {
                    column: 'to_document_uuid',
                    operator: 'eq',
                    value: relationship.to_document_uuid,
                  },
                  { column: 'predicate_uuid', operator: 'eq', value: relationship.predicate_uuid },
                ],
              },
            })
          ).length > 0,
      })
      setRelationshipResults(results)
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLinkingRelationships(false)
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
                  const choice = viewConfig.entryChoices?.find(
                    (candidate) => candidate.key === sourceConfig.entryChoiceKey
                  )
                  const selectedChoice = sourceConfig.entryChoiceKey
                    ? entryChoiceValues[sourceConfig.entryChoiceKey]
                    : undefined
                  return (
                    <section
                      key={sourceConfig.key}
                      className="border p-3"
                      aria-label={sourceConfig.label}
                    >
                      <h2 className="font-semibold">{sourceConfig.label}</h2>
                      {sourceConfig.description && (
                        <p className="mb-3 text-sm text-gray-600">{sourceConfig.description}</p>
                      )}
                      {choice && (
                        <label className="mb-3 flex flex-col gap-1 text-sm">
                          <span className="font-medium">{choice.label}</span>
                          <select
                            className="h-9 border bg-white px-2"
                            value={entryChoiceValues[choice.key] ?? ''}
                            disabled={sources.some(
                              (source) => source.config.entryChoiceKey === choice.key
                            )}
                            onChange={(event) =>
                              setEntryChoiceValues((current) => ({
                                ...current,
                                [choice.key]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Choose a location type</option>
                            {choice.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {sourceConfig.entryChoiceKey && !selectedChoice ? (
                        <p className="text-sm text-gray-600" role="status">
                          Choose {choice?.label.toLowerCase() ?? 'an option'} before uploading this file.
                        </p>
                      ) : (
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
                      )}
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
                  <div
                    key={source.sourceId}
                    className="flex flex-wrap items-center gap-2 border px-3 py-2"
                  >
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
                        setCompletedSourceIds(new Set())
                        setSources(remaining)
                        if (activeSourceId === source.sourceId)
                          setActiveSourceId(remaining[0]?.sourceId ?? null)
                      }}
                    >
                      <X size={14} />
                    </Button>
                    <div className="basis-full" />
                    <label className="flex items-center gap-2 text-xs">
                      <span>Object type</span>
                      <select
                        value={source.selectedObjectTypeUuid ?? ''}
                        onChange={(event) => {
                          const objectType = contextState.object_type_by_uuid[event.target.value]
                          handleObjectTypeSelected(source.sourceId, objectType)
                        }}
                        className="border px-2 py-1"
                      >
                        <option value="">Choose type</option>
                        {contextState.object_type.map((objectType) => (
                          <option key={objectType.uuid} value={objectType.uuid}>
                            {objectType.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <span>Role</span>
                      <select
                        value={source.role}
                        disabled={viewConfig.relationships === 'fixed'}
                        onChange={(event) => {
                          const role = event.target.value as CSVImportSourceRole
                          const arrayTarget =
                            role === 'array'
                              ? (source.arrayTarget ?? {
                                parentSourceKey: '',
                                arrayFieldPath: '',
                                parentMatchField: '',
                                rowMatchField: '',
                              })
                              : undefined
                          updateSource(source.sourceId, {
                            role,
                            relationshipRule:
                              role === 'child' ? source.relationshipRule : undefined,
                            arrayTarget,
                            adapter:
                              role === 'array' || source.arrayTarget
                                ? {
                                  ...source.adapter,
                                  arrayTarget,
                                }
                                : source.adapter,
                          })
                        }}
                        className="border px-2 py-1"
                      >
                        <option value="standalone">Standalone</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="array">Array items</option>
                      </select>
                    </label>
                    {source.role === 'child' && (
                      <span className="bg-slate-100 px-2 py-1 text-xs">Child document</span>
                    )}
                    {source.role === 'parent' && (
                      <span className="bg-slate-100 px-2 py-1 text-xs">Parent document</span>
                    )}
                    {source.role !== 'child' && source.role !== 'array' && sources.length > 1 && (
                      <div className="basis-full border-t pt-3 text-sm">
                        <div className="grid gap-3 md:grid-cols-4">
                          <label className="flex flex-col gap-1">
                            <span className="font-medium">Related CSV</span>
                            <select
                              value={source.relationshipRule?.childObjectTypeSlug ?? ''}
                              onChange={(event) => {
                                setCompletedSourceIds(new Set())
                                const child = sources.find(
                                  (candidate) => candidate.typeSlug === event.target.value
                                )
                                const previousChild = sources.find(
                                  (candidate) =>
                                    candidate.typeSlug ===
                                    source.relationshipRule?.childObjectTypeSlug
                                )
                                if (!child) {
                                  setSources((current) =>
                                    clearCSVRelationshipRule(
                                      current,
                                      source.sourceId,
                                      previousChild?.sourceId,
                                      viewConfig.relationships === 'fixed'
                                        ? viewConfig.relationshipRules
                                        : undefined
                                    ).map((candidate, index) => {
                                      if (candidate === current[index]) return candidate
                                      return {
                                        ...candidate,
                                        adapter: createCSVImportAdapter({
                                          id: candidate.sourceId,
                                          label: csvFileNameToTypeLabel(candidate.fileName),
                                          text: candidate.fileText,
                                          mapping: candidate.mapping,
                                          relationshipFields: candidate.relationshipFields,
                                          relationshipRules:
                                            viewConfig.relationships === 'fixed'
                                              ? viewConfig.relationshipRules
                                              : undefined,
                                          arrayTarget: candidate.arrayTarget,
                                          fixedFields: getCSVSourceFixedFields(candidate),
                                          fieldMappings: candidate.arrayTarget
                                            ? undefined
                                            : (candidate.selectedObjectTypeUuid
                                              ? contextState.object_type_by_uuid[candidate.selectedObjectTypeUuid]
                                              : contextState.object_type_by_slug[candidate.typeSlug])
                                              ?.data?.field_mappings,
                                          sourceKey: candidate.config.key,
                                          schema: candidate.adapter.schema,
                                        }),
                                      }
                                    })
                                  )
                                  return
                                }
                                const relationshipRule = {
                                  parentObjectTypeSlug: source.typeSlug,
                                  childObjectTypeSlug: child.typeSlug,
                                  parentMatchField: source.relationshipRule?.parentMatchField ?? '',
                                  childMatchField: source.relationshipRule?.childMatchField ?? '',
                                  predicate: source.relationshipRule?.predicate || 'has_parent',
                                }
                                setSources((current) =>
                                  current.map((candidate) => {
                                    if (candidate.sourceId === source.sourceId) {
                                      return {
                                        ...candidate,
                                        role: 'parent',
                                        relationshipRule,
                                      }
                                    }
                                    if (candidate.sourceId === previousChild?.sourceId) {
                                      return {
                                        ...candidate,
                                        role: 'standalone',
                                        relationshipRule: undefined,
                                      }
                                    }
                                    if (candidate.sourceId === child.sourceId) {
                                      return { ...candidate, role: 'child', relationshipRule }
                                    }
                                    return candidate
                                  })
                                )
                              }}
                              className="border px-2 py-1"
                            >
                              <option value="">Select related CSV</option>
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
                              <label className="flex flex-col gap-1">
                                <span className="font-medium">Parent lookup column</span>
                                <select
                                  value={source.relationshipRule.parentMatchField ?? ''}
                                  onChange={(event) => {
                                    const relationshipRule = {
                                      ...source.relationshipRule!,
                                      parentMatchField: event.target.value,
                                    }
                                    updateRelationshipRule(relationshipRule)
                                  }}
                                  className="border px-2 py-1"
                                >
                                  <option value="">Select column</option>
                                  {source.parsed.headers.map((header) => (
                                    <option key={header.key} value={header.key}>
                                      {header.key}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="font-medium">Child lookup column</span>
                                <select
                                  value={source.relationshipRule.childMatchField ?? ''}
                                  onChange={(event) => {
                                    const relationshipRule = {
                                      ...source.relationshipRule!,
                                      childMatchField: event.target.value,
                                    }
                                    updateRelationshipRule(relationshipRule)
                                  }}
                                  className="border px-2 py-1"
                                >
                                  <option value="">Select column</option>
                                  {(
                                    sources.find(
                                      (candidate) =>
                                        candidate.typeSlug ===
                                        source.relationshipRule?.childObjectTypeSlug
                                    )?.parsed.headers ?? []
                                  ).map((header) => (
                                    <option key={header.key} value={header.key}>
                                      {header.key}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="font-medium">Predicate on child</span>
                                <select
                                  value={source.relationshipRule.predicate}
                                  onChange={(event) =>
                                    updateRelationshipRule({
                                      ...source.relationshipRule!,
                                      predicate: event.target.value,
                                    })
                                  }
                                  className="border px-2 py-1"
                                >
                                  {contextState.predicate.map((predicate) => (
                                    <option key={predicate.uuid} value={predicate.predicate}>
                                      {predicate.label} ({predicate.predicate})
                                    </option>
                                  ))}
                                  {!contextState.predicate.some(
                                    ({ predicate }) => predicate === 'has_parent'
                                  ) && <option value="has_parent">Has parent (has_parent)</option>}
                                </select>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {source.role === 'array' && sources.length > 1 && (
                      <div className="basis-full border-t pt-3 text-sm">
                        <div className="grid gap-3 md:grid-cols-4">
                          <label className="flex flex-col gap-1">
                            <span className="font-medium">Parent CSV</span>
                            <select
                              value={source.arrayTarget?.parentSourceKey ?? ''}
                              onChange={(event) => {
                                const parent = sources.find(
                                  (candidate) => candidate.config.key === event.target.value
                                )
                                if (!parent) return
                                const arrayTarget = {
                                  parentSourceKey: parent.config.key,
                                  arrayFieldPath: source.arrayTarget?.arrayFieldPath ?? '',
                                  parentMatchField: source.arrayTarget?.parentMatchField ?? '',
                                  rowMatchField: source.arrayTarget?.rowMatchField ?? '',
                                }
                                updateSource(source.sourceId, {
                                  arrayTarget,
                                  typeSlug: parent.typeSlug,
                                  selectedObjectTypeUuid: parent.selectedObjectTypeUuid,
                                  adapter: { ...source.adapter, arrayTarget },
                                })
                              }}
                              className="border px-2 py-1"
                            >
                              <option value="">Select parent CSV</option>
                              {sources
                                .filter((candidate) => candidate.sourceId !== source.sourceId)
                                .map((candidate) => (
                                  <option key={candidate.sourceId} value={candidate.config.key}>
                                    {candidate.fileName}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-medium">Parent array path</span>
                            <input
                              value={source.arrayTarget?.arrayFieldPath ?? ''}
                              onChange={(event) => {
                                const arrayTarget = {
                                  ...source.arrayTarget!,
                                  arrayFieldPath: event.target.value,
                                }
                                updateSource(source.sourceId, {
                                  arrayTarget,
                                  adapter: { ...source.adapter, arrayTarget },
                                })
                              }}
                              placeholder="contacts"
                              className="border px-2 py-1"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-medium">Parent lookup column</span>
                            <select
                              value={source.arrayTarget?.parentMatchField ?? ''}
                              onChange={(event) => {
                                const arrayTarget = {
                                  ...source.arrayTarget!,
                                  parentMatchField: event.target.value,
                                }
                                updateSource(source.sourceId, {
                                  arrayTarget,
                                  adapter: { ...source.adapter, arrayTarget },
                                })
                              }}
                              className="border px-2 py-1"
                            >
                              <option value="">Select column</option>
                              {(
                                sources.find(
                                  (candidate) =>
                                    candidate.config.key === source.arrayTarget?.parentSourceKey
                                )?.parsed.headers ?? []
                              ).map((header) => (
                                <option key={header.key} value={header.key}>
                                  {header.key}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-medium">Array row lookup column</span>
                            <select
                              value={source.arrayTarget?.rowMatchField ?? ''}
                              onChange={(event) => {
                                const arrayTarget = {
                                  ...source.arrayTarget!,
                                  rowMatchField: event.target.value,
                                }
                                updateSource(source.sourceId, {
                                  arrayTarget,
                                  adapter: { ...source.adapter, arrayTarget },
                                })
                              }}
                              className="border px-2 py-1"
                            >
                              <option value="">Select column</option>
                              {source.parsed.headers.map((header) => (
                                <option key={header.key} value={header.key}>
                                  {header.key}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {loadError && (
            <div className="text-sm text-red-700" role="alert">
              {loadError}
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
                {activeSource.parsed.data.length} records, {sources.length} source
                {sources.length === 1 ? '' : 's'}
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
                  <details key={source.sourceId} className="border px-3 py-2" open>
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
                      {viewConfig.relationships === 'fixed' && (
                        <CSVSourceEditor
                          source={source}
                          sources={sources}
                          mode="relationships"
                          viewConfig={viewConfig}
                          onChange={(update) => updateSource(source.sourceId, update)}
                        />
                      )}
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
              {viewConfig.relationships === 'fixed' && (
                <CSVSourceEditor
                  source={activeSource}
                  sources={sources}
                  mode="relationships"
                  viewConfig={viewConfig}
                  onChange={(update) => updateSource(activeSource.sourceId, update)}
                />
              )}
            </>
          ) : null}
          {loadError && (
            <div className="text-sm text-red-700" role="alert">
              {loadError}
            </div>
          )}
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
        </div>
      )}

      {activeWizardStep === 'import' && activeSource && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">
                {sources.length > 1 ? 'Import CSV records' : `Import ${activeSource.fileName}`}
              </h1>
              <span className="text-sm text-gray-600">
                {sources.length > 1
                  ? `${sources.length} sources loaded`
                  : `${activeSource.parsed.data.length} records loaded`}
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setActiveWizardStep('upload')}>
              Back to CSV sources
            </Button>
          </div>
          {sources.length > 1 && (
            <section className="mb-3 border-b pb-3" aria-label="CSV relationship review">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <strong>CSV relationship review</strong>
                <span>
                  {csvRelationshipPlans.filter(({ status }) => status === 'ready').length} ready
                </span>
                <span>
                  {csvRelationshipPlans.filter(({ status }) => status !== 'ready').length} blockers
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={
                    isLinkingRelationships ||
                    csvRelationshipPlans.length === 0 ||
                    csvRelationshipPlans.some(({ status }) => status !== 'ready')
                  }
                  onClick={() => void linkCSVRelationships()}
                >
                  {isLinkingRelationships ? 'Linking relationships...' : 'Link relationships'}
                </Button>
              </div>
              {csvRelationshipPlans
                .filter(({ status }) => status !== 'ready')
                .map((plan) => (
                  <div
                    key={`${plan.child.record.provenance.sourceId}:${plan.child.record.provenance.externalId}`}
                    className="mt-2 text-sm text-red-700"
                  >
                    {plan.child.record.label}: {plan.reason ?? `Relationship is ${plan.status}.`}
                  </div>
                ))}
              {relationshipResults.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  <div>
                    {relationshipResults.filter(({ status }) => status === 'created').length}{' '}
                    created,{' '}
                    {relationshipResults.filter(({ status }) => status === 'existing').length}{' '}
                    already existed,{' '}
                    {relationshipResults.filter(({ status }) => status === 'blocked').length}{' '}
                    blocked,{' '}
                    {relationshipResults.filter(({ status }) => status === 'failed').length} failed
                  </div>
                  {relationshipResults
                    .filter(({ status }) => status === 'blocked' || status === 'failed')
                    .map((result) => (
                      <div key={result.relationshipKey} className="mt-1 text-red-700">
                        {result.status === 'blocked' ? 'Blocked' : 'Failed'}:{' '}
                        {result.error ?? result.relationshipKey}
                      </div>
                    ))}
                </div>
              )}
              {relationshipError && (
                <div className="mt-2 text-sm text-red-700" role="alert">
                  {relationshipError}
                </div>
              )}
              <details className="mt-3 border bg-gray-50 p-2 text-xs">
                <summary className="cursor-pointer font-medium">Planner state</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      sources: sources.map((source) => ({
                        fileName: source.fileName,
                        role: source.role,
                        typeSlug: source.typeSlug,
                        selectedObjectTypeUuid: source.selectedObjectTypeUuid,
                        relationshipRule: source.relationshipRule,
                        recordsLoaded: loadedSourceRecords[source.sourceId]?.records.length ?? 0,
                      })),
                      plans: csvRelationshipPlans.map((plan) => ({
                        parent: plan.parent?.record.label,
                        child: plan.child.record.label,
                        predicate: plan.predicate,
                        status: plan.status,
                        reason: plan.reason,
                      })),
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </section>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            {sources.length > 1 ? (
              <div className="grid min-h-0 gap-4 overflow-auto lg:grid-cols-2">
                {documentSourcesInDependencyOrder.map((source) => {
                  const pendingDependencies = (executionDependencies.get(source.sourceId) ?? [])
                    .filter((dependencyId) => !completedSourceIds.has(dependencyId))
                  const pendingFiles = pendingDependencies.map(
                    (dependencyId) =>
                      sources.find((candidate) => candidate.sourceId === dependencyId)?.fileName ??
                      dependencyId
                  )
                  return (
                    <CSVSourceImportPanel
                      key={source.sourceId}
                      source={source}
                      loaded={loadedSourceRecords[source.sourceId]}
                      executionBlocked={pendingDependencies.length > 0}
                      executionBlockMessage={
                        pendingFiles.length > 0
                          ? `Import ${pendingFiles.join(', ')} first to preserve parent-child order.`
                          : undefined
                      }
                      onObjectTypeSelected={handleObjectTypeSelected}
                      onImportAttemptComplete={markSourceImportAttemptComplete}
                    />
                  )
                })}
              </div>
            ) : (
              <ImportRecordsPage
                key={`${activeSource.adapter.id}-${activeSource.parsed.data.length}`}
                type={activeSource.sourceId}
                objectTypeSlug={activeSource.typeSlug}
                label={csvFileNameToTypeLabel(activeSource.fileName)}
                pluralLabel="CSV records"
                sourceAdapter={activeSource.adapter}
                csvSource
                arraySource={Boolean(activeSource.arrayTarget)}
                startAtImport={activeSource.startAtImport}
                onObjectTypeSelected={onActiveObjectTypeSelected}
                icon={FileSpreadsheet}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVImportPage
