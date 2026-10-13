import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { ChevronDown, FileSpreadsheet, X } from 'lucide-react'
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
  isCSVSchemaMappingComplete,
  getAvailableCSVSchemaFieldPaths,
  getCSVArrayItemSchema,
  getCSVOptionalObjectArrayFields,
  getCSVSchemaFields,
  inferCSVSchemaFieldMappings,
} from '../csv_adapter'
import type { CSVImportMapping } from '../csv_adapter'
import {
  formatCSVRecordsError,
  getCSVDocumentSources,
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
import {
  fetchDocumentsByDataFieldValues,
  fetchExistingImportDocuments,
} from '../reconciliation_service'
import { getDocumentImportProvenance, reconcileImportRecords } from '../reconciliation'
import {
  persistImportRelationships,
  planImportRelationships,
  getRelationshipMatchValue,
  importRelationshipKey,
  relationshipDocumentKey,
  type ImportRelationshipPersistenceResult,
  type ImportRelationshipPlan,
  type ImportRelationshipCandidate,
} from '../relationship_planning'
import ImportRecordsPage from './index'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  isValidationComplete,
  importRecordKey,
  useImportSession,
  useImportSessions,
} from '../state/importState'
import type { ImportConflictAction } from '../reconciliation'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import { omit } from 'lodash-es'
import { uploadedImportSourcesAtom } from '../state/uploadedImportSources'
import {
  clearCSVRelationshipRule,
  getUniqueCSVRelationshipRules,
  mirrorCSVRelationshipRule,
  resolveCSVRelationshipRules,
} from '../csv_relationships'
import { updateCSVImportSource } from '../csv_import_source_state'
import { ImportWizard } from '../components/import_wizard'
import { fetchRelationships, postRelationship } from '@/manage/relationship/services'
import { useAuth } from '@/auth/useAuth'
import type { ParsedWorkbookSheet } from '../workbook'
import { selectWorkbookSheets } from '../workbook_selection'

const csvField = {
  id: 'csv-file',
  label: 'CSV file',
  description: 'Upload CSV files to preview and import them as independent sources.',
} as IFieldInputProps['field']

export type CSVImportSource = {
  sourceId: string
  config: CSVImportSourceConfig
  role: CSVImportSourceRole
  arrayTarget?: ImportArraySourceTarget
  typeSlug: string
  selectedObjectTypeUuid?: string
  fileName: string
  fileText: string
  workbookFileName?: string
  schemaChoiceValue?: string
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
  optional?: boolean
  role?: CSVImportSourceRole
  relationshipFields?: string[]
  schemaChoice?: {
    key: string
    branchPath: string
    valuePath: string
  }
  arrayTarget?: ImportArraySourceTarget
}

export type CSVImportSchemaChoice = {
  key: string
  label: string
  placeholder: string
  showLabel?: boolean
  options: Array<{ value: string; label: string }>
}

export type CSVImportViewConfig = {
  mapping: 'required' | 'assumed'
  relationships: 'user-configured' | 'fixed'
  relationshipPresentation?: 'detailed' | 'guided'
  knownObjectTypeSlug?: string
  relationshipFields?: string[]
  relationshipRules?: ImportRelationshipRule[]
  sourceConfigs?: CSVImportSourceConfig[]
  schemaChoices?: CSVImportSchemaChoice[]
}

const getCSVSourceBranchSelections = (
  source: Pick<CSVImportSource, 'config' | 'schemaChoiceValue'>
): Record<string, string> =>
  source.config.schemaChoice && source.schemaChoiceValue
    ? { [source.config.schemaChoice.branchPath]: source.schemaChoiceValue }
    : {}

const getCSVSourceFixedFields = (
  source: Pick<CSVImportSource, 'config' | 'schemaChoiceValue'>
): Record<string, unknown> =>
  source.config.schemaChoice && source.schemaChoiceValue
    ? { [source.config.schemaChoice.valuePath]: source.schemaChoiceValue }
    : {}

const validateCSVRecords = (
  records: CanonicalImportRecord[],
  schema: JSONSchema6
): Array<{ record: CanonicalImportRecord; result: { isValid: boolean; errors: string[] } }> => {
  const cleanedSchema = omit(schema as Record<string, unknown>, '$schema')
  return records.map((record) => {
    const errors = schemaToFormUtils.validateAgainstSchema(
      cleanedSchema,
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
}

const defaultCSVImportViewConfig: CSVImportViewConfig = {
  mapping: 'required',
  relationships: 'user-configured',
  relationshipPresentation: 'detailed',
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

export const CSVSourceEditor = ({
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
  objectType,
  schema,
  onObjectTypeSelected,
  executionBlocked,
  executionBlockMessage,
  externalImportControl,
  startImportRequest,
  onImportAttemptComplete,
}: {
  source: CSVImportSource
  loaded?: { candidates: ImportCandidate[]; records: CanonicalImportRecord[] }
  objectType?: IObjectType
  schema?: JSONSchema6
  onObjectTypeSelected: (sourceId: string, objectType: IObjectType | undefined) => void
  executionBlocked: boolean
  executionBlockMessage?: string
  externalImportControl: boolean
  startImportRequest: number
  onImportAttemptComplete: (sourceId: string) => void
}): ReactElement => {
  const {
    session,
    setCandidates,
    setRecords,
    setSelectedObjectType,
    setSchema,
    setValidationResults,
    setReconciliations,
    setConflictAction,
  } = useImportSession(source.sourceId)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [duplicateCheckError, setDuplicateCheckError] = useState<string>()
  const auth = useAuth()
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
    if (session.records === loaded.records) return
    setCandidates(loaded.candidates)
    setRecords(loaded.records)
    setSchema(schema ?? null)
    if (objectType) setSelectedObjectType(objectType)
  }, [
    loaded,
    objectType,
    schema,
    session.records,
    setCandidates,
    setRecords,
    setSchema,
    setSelectedObjectType,
  ])

  useEffect(() => {
    if (!loaded || session.records !== loaded.records || !session.schema || isValidationComplete(session))
      return
    setValidationResults(validateCSVRecords(loaded.records, session.schema))
  }, [loaded, session, setValidationResults])

  useEffect(() => {
    const token = auth.user?.access_token
    if (
      !source.startAtImport ||
      !loaded ||
      !objectType ||
      !token ||
      session.records !== loaded.records ||
      !isValidationComplete(session) ||
      !session.records.every((record) => session.validationResults[importRecordKey(record)]?.isValid) ||
      session.reconciliations
    ) return

    const controller = new AbortController()
    void fetchExistingImportDocuments({
      records: session.records,
      objectTypeUuid: objectType.uuid,
      token,
      signal: controller.signal,
    }).then((existingDocuments) => {
      if (controller.signal.aborted) return
      setDuplicateCheckError(undefined)
      setReconciliations(reconcileImportRecords(session.records, existingDocuments))
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setDuplicateCheckError(error instanceof Error ? error.message : String(error))
    })
    return () => controller.abort()
  }, [
    auth.user,
    loaded,
    objectType,
    session,
    setReconciliations,
    source.startAtImport,
  ])

  useEffect(() => {
    if (!loaded || loaded.records.length > 0 || executionBlocked) return
    onImportAttemptComplete(source.sourceId)
  }, [executionBlocked, loaded, onImportAttemptComplete, source.sourceId])

  const records = loaded?.records ?? []
  const validCount = records.filter(
    (record) => session.validationResults[importRecordKey(record)]?.isValid
  ).length
  const invalidCount = records.filter(
    (record) => session.validationResults[importRecordKey(record)]?.isValid === false
  ).length
  const pendingValidationCount = records.length - validCount - invalidCount
  const duplicateReconciliations = session.reconciliations?.filter(
    ({ status }) => status === 'exact' || status === 'conflicting'
  ) ?? []
  const duplicateCount = session.reconciliations?.filter(({ status }) => status !== 'new').length ?? 0
  const duplicateAction = duplicateReconciliations.length > 0 &&
    duplicateReconciliations.every(({ action }) => action === duplicateReconciliations[0].action)
    ? duplicateReconciliations[0].action ?? ''
    : ''

  return (
    <>
      <div className="grid grid-cols-1 gap-3 border-b py-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.3fr)_minmax(10rem,1fr)_minmax(13rem,1fr)_auto] xl:items-center">
        <div role="cell" className="min-w-0">
          <span className="text-xs text-gray-500 xl:hidden">Type</span>
          <strong className="block truncate text-sm">{objectType?.label ?? 'None'}</strong>
          {objectType && <span className="block truncate text-xs text-gray-500">{objectType.slug}</span>}
        </div>
        <div role="cell" className="text-sm">
          <span className="text-xs text-gray-500 xl:hidden">Records</span>
          <div>
            {validCount} valid · {invalidCount} invalid
            {pendingValidationCount > 0 && ` · ${pendingValidationCount} pending`}
          </div>
        </div>
        <div role="cell" className="min-w-0 text-sm">
          <span className="text-xs text-gray-500 xl:hidden">Duplicate handling</span>
          {duplicateCheckError && !session.reconciliations ? (
            <span className="text-red-700" role="alert" title={duplicateCheckError}>
              Duplicate check failed
            </span>
          ) : source.startAtImport && loaded && objectType && auth.user?.access_token &&
            session.records === loaded.records && isValidationComplete(session) &&
            !session.reconciliations ? (
            <span className="text-gray-500" role="status">Checking duplicates...</span>
          ) : duplicateReconciliations.length > 0 ? (
            <label className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs text-gray-600">{duplicateCount} found</span>
              <select
                className="h-8 min-w-0 max-w-full border bg-white px-2"
                aria-label={`Duplicate handling for ${source.fileName}`}
                value={duplicateAction}
                onChange={(event) => {
                  const action = event.target.value as ImportConflictAction
                  duplicateReconciliations.forEach(({ record }) => setConflictAction(record, action))
                }}
              >
                {!duplicateAction && <option value="">Mixed handling</option>}
                <option value="ignore">Ignore duplicates</option>
                <option value="overwrite">Overwrite existing</option>
                <option value="merge">Merge with existing</option>
              </select>
            </label>
          ) : duplicateCount > 0 ? (
            <span>{duplicateCount} ambiguous; review details</span>
          ) : session.reconciliations ? (
            <span className="text-gray-500">None found</span>
          ) : (
            <span className="text-gray-500">Not checked</span>
          )}
        </div>
        <div role="cell" className="flex justify-start xl:justify-end">
          <Button
            size="xs"
            variant="outline"
            disabled={!loaded}
            onClick={() => setIsDetailsOpen(true)}
          >
            Edit type &amp; validate
          </Button>
        </div>
      </div>
      {loaded && (
        <div className="hidden">
          <ImportRecordsPage
            key={`${source.adapter.id}-${loaded.records.length}-execution`}
            type={source.sourceId}
            objectTypeSlug={source.typeSlug}
            label={csvFileNameToTypeLabel(source.fileName)}
            pluralLabel="CSV records"
            sourceAdapter={source.adapter}
            csvSource
            arraySource={Boolean(source.arrayTarget)}
            startAtImport
            externalImportControl={externalImportControl}
            startImportRequest={startImportRequest}
            executionBlocked={executionBlocked}
            executionBlockMessage={executionBlockMessage}
            onImportAttemptComplete={handleImportAttemptComplete}
            onObjectTypeSelected={handlePanelObjectTypeSelected}
            icon={FileSpreadsheet}
          />
        </div>
      )}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="flex h-[calc(100vh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none flex-col overflow-hidden sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{source.fileName}</DialogTitle>
            <DialogDescription>
              Select or edit the object type and schema, then validate the records.
            </DialogDescription>
          </DialogHeader>
          {loaded ? (
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
                startAtImport={false}
                externalImportControl={externalImportControl}
                startImportRequest={0}
                executionBlocked={executionBlocked}
                executionBlockMessage={executionBlockMessage}
                onImportAttemptComplete={handleImportAttemptComplete}
                onObjectTypeSelected={handlePanelObjectTypeSelected}
                icon={FileSpreadsheet}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600">Records are still loading.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

const CSVImportPage = ({
  viewConfig = defaultCSVImportViewConfig,
}: {
  viewConfig?: CSVImportViewConfig
}): ReactElement => {
  const [sources, setSources] = useState<CSVImportSource[]>([])
  const [sourceSetupDisclosure, setSourceSetupDisclosure] = useState({
    complete: false,
    expanded: true,
  })
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'records'>('upload')
  const [activeWizardStep, setActiveWizardStep] = useState<'upload' | 'mapping' | 'import'>(
    'upload'
  )
  const [uploadFormat, setUploadFormat] = useState<'csv' | 'xlsx'>()
  const [uploadMultipleFiles, setUploadMultipleFiles] = useState(false)
  const [schemaChoiceValues, setSchemaChoiceValues] = useState<Record<string, string>>({})
  const [selectedWorkbookTypes, setSelectedWorkbookTypes] = useState<Record<string, string>>({})
  const [uploadKey, setUploadKey] = useState(0)
  const sourceSequence = useRef(0)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [loadedSourceRecords, setLoadedSourceRecords] = useState<
    Record<string, { candidates: ImportCandidate[]; records: CanonicalImportRecord[] }>
  >({})
  const [completedSourceIds, setCompletedSourceIds] = useState<Set<string>>(() => new Set())
  const [importRequest, setImportRequest] = useState(0)
  const autoLinkedImportRequest = useRef(0)
  const [sessionImportStarted, setSessionImportStarted] = useState(false)
  const [pendingWorkbook, setPendingWorkbook] = useState<{
    fileName: string
    sheets: ParsedWorkbookSheet[]
  }>()
  const [activeWorkbookFileName, setActiveWorkbookFileName] = useState<string>()
  const workbookInputRef = useRef<HTMLInputElement>(null)
  const [selectedWorkbookSheets, setSelectedWorkbookSheets] = useState<Set<string>>(
    () => new Set()
  )
  const [isReadingWorkbook, setIsReadingWorkbook] = useState(false)
  const [relationshipResults, setRelationshipResults] = useState<
    ImportRelationshipPersistenceResult[]
  >([])
  const [existingParentLookup, setExistingParentLookup] = useState<{
    key: string
    candidates: ImportRelationshipCandidate[]
  }>({ key: '', candidates: [] })
  const [selectedRelationshipParents, setSelectedRelationshipParents] = useState<Record<string, string>>({})
  const [ignoredRelationshipRows, setIgnoredRelationshipRows] = useState<Set<string>>(() => new Set())
  const [isLinkingRelationships, setIsLinkingRelationships] = useState(false)
  const [relationshipError, setRelationshipError] = useState<string>()
  const [contextState] = useAtom(contextStateAtom)
  const auth = useAuth()
  const [, setUploadedImportSources] = useAtom(uploadedImportSourcesAtom)
  const activeSource = sources.find((source) => source.sourceId === activeSourceId) ?? null
  const activeSession = useImportSession(activeSource?.sourceId ?? 'csv-upload')
  const configuredArraySource = sources.find((source) => source.role === 'array')
  const configuredParentSource = configuredArraySource
    ? sources.find(
      (source) => source.config.key === configuredArraySource.arrayTarget?.parentSourceKey
    )
    : sources.find((source) => source.role === 'parent')
  const parentSession = useImportSession(
    configuredParentSource?.sourceId ?? 'csv-configured-parent'
  )
  const importSessions = useImportSessions()
  const sourceConfigs = useMemo(() => {
    const configuredSources = viewConfig.sourceConfigs ?? []
    const configuredArrayPaths = new Set(
      configuredSources
        .filter((source) => source.arrayTarget)
        .map(
          (source) =>
            `${source.arrayTarget?.parentSourceKey}:${source.arrayTarget?.arrayFieldPath}`
        )
    )
    const optionalArraySources: CSVImportSourceConfig[] = configuredSources
      .filter((source) => source.role !== 'array' && !source.arrayTarget)
      .flatMap((parentSource) => {
        const objectType = contextState.object_type_by_slug[parentSource.typeSlug]
        const schema = objectType
          ? (contextState.object_schema_defaults_by_object_type_uuid[objectType.uuid]
            ?.json_schema as JSONSchema6 | undefined)
          : undefined
        return getCSVOptionalObjectArrayFields(schema)
          .filter(
            ({ path }) => !configuredArrayPaths.has(`${parentSource.key}:${path}`)
          )
          .map(({ path, title }) => {
            const key = `${parentSource.key}-array-${path.replace(/[^a-zA-Z0-9]+/g, '-')}`
            return {
              key,
              label: `${parentSource.label} ${title}`,
              description: `Optional rows for the ${title} array on ${parentSource.label}.`,
              typeSlug: parentSource.typeSlug,
              typeKnown: true,
              mapping: 'required' as const,
              optional: true,
              role: 'array' as const,
              arrayTarget: {
                parentSourceKey: parentSource.key,
                arrayFieldPath: path,
                parentMatchField: '',
                rowMatchField: '',
              },
            }
          })
      })
    return [...configuredSources, ...optionalArraySources]
  }, [
    contextState.object_schema_defaults_by_object_type_uuid,
    contextState.object_type_by_slug,
    viewConfig,
  ])
  const effectiveViewConfig = useMemo(
    () => ({ ...viewConfig, sourceConfigs }),
    [sourceConfigs, viewConfig]
  )
  const sourceCountLabel = useMemo(
    () => `${sources.length} CSV source${sources.length === 1 ? '' : 's'}`,
    [sources.length]
  )
  const getSourceObjectType = (source: CSVImportSource): IObjectType | undefined =>
    source.selectedObjectTypeUuid
      ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
      : contextState.object_type_by_slug[source.typeSlug]
  const getSourceSchema = (source: CSVImportSource): JSONSchema6 | undefined => {
    const objectType = getSourceObjectType(source)
    const schema = objectType
      ? (contextState.object_schema_defaults_by_object_type_uuid[objectType.uuid]
        ?.json_schema as JSONSchema6 | undefined)
      : undefined
    return source.arrayTarget
      ? getCSVArrayItemSchema(schema, source.arrayTarget.arrayFieldPath)
      : schema
  }
  const allRequiredSourcesUploaded = sourceConfigs.every(
    (sourceConfig) =>
      sourceConfig.optional || sources.some((source) => source.config.key === sourceConfig.key)
  )
  const canPrepareImport = sources.length > 0 && allRequiredSourcesUploaded
  const inferredMappingsAreConfident = sources.every((source) =>
    isCSVSchemaMappingComplete(
      source.parsed.headers.map((header) => header.key),
      source.mapping,
      getSourceSchema(source),
      source.relationshipFields,
      getCSVSourceBranchSelections(source)
    )
  )
  const canSourceStartAtImport = (
    source: CSVImportSource,
    records: CanonicalImportRecord[]
  ): boolean => {
    const schema = getSourceSchema(source)
    if (source.arrayTarget || !schema || records.length === 0) return false
    if (
      !isCSVSchemaMappingComplete(
        source.parsed.headers.map((header) => header.key),
        source.mapping,
        schema,
        source.relationshipFields,
        getCSVSourceBranchSelections(source)
      )
    ) return false
    return validateCSVRecords(records, schema).every(({ result }) => result.isValid)
  }
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
  }, [setCompletedSourceIds])

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
    [contextState, setCompletedSourceIds, viewConfig]
  )
  const resolvedRelationshipRules = useMemo(
    () => resolveCSVRelationshipRules(
      getCSVDocumentSources(sources),
      (source) => {
        const objectType = source.selectedObjectTypeUuid
          ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
          : contextState.object_type_by_slug[source.typeSlug]
        return objectType?.slug
      }
    ),
    [contextState.object_type_by_slug, contextState.object_type_by_uuid, sources]
  )
  const sourceSetupIsComplete =
    sources.length > 0 &&
    allRequiredSourcesUploaded &&
    sources.every((source) => {
      if (!getSourceObjectType(source)) return false
      if (source.role === 'array') {
        const target = source.arrayTarget
        return Boolean(
          target?.parentSourceKey &&
          sources.some(
            (candidate) =>
              candidate.config.key === target.parentSourceKey && candidate.role !== 'array'
          ) &&
          target.arrayFieldPath &&
          target.parentMatchField &&
          target.rowMatchField
        )
      }
      if (
        viewConfig.relationships === 'user-configured' &&
        (source.role === 'parent' || source.role === 'child')
      ) {
        const rule = source.relationshipRule
        return Boolean(
          rule?.parentObjectTypeSlug &&
          rule.childObjectTypeSlug &&
          rule.parentMatchField &&
          rule.childMatchField &&
          rule.predicate
        )
      }
      return true
    }) &&
    (viewConfig.relationships !== 'fixed' ||
      (viewConfig.relationshipRules ?? []).every(
        (rule) =>
          rule.parentObjectTypeSlug &&
          rule.childObjectTypeSlug &&
          rule.parentMatchField &&
          rule.childMatchField &&
          rule.predicate
      ))

  const sourceSetupDefaultsExpanded =
    viewConfig === defaultCSVImportViewConfig || !sourceSetupIsComplete
  const isSourceSetupExpanded =
    sourceSetupDisclosure.complete === sourceSetupIsComplete
      ? sourceSetupDisclosure.expanded
      : sourceSetupDefaultsExpanded

  const existingParentLookupRules = useMemo(
    () => resolvedRelationshipRules.filter(
      (rule) => rule.existingParentPolicy === 'lookup' && rule.parentMatchField && rule.childMatchField
    ),
    [resolvedRelationshipRules]
  )
  const existingParentLookupKey = useMemo(() => JSON.stringify({
    user: auth.user?.profile.sub,
    rules: existingParentLookupRules,
    inputs: sources.map((source) => {
      const objectType = source.selectedObjectTypeUuid
        ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
        : contextState.object_type_by_slug[source.typeSlug]
      const childFields = existingParentLookupRules
        .filter((rule) => rule.childObjectTypeSlug === (objectType?.slug ?? source.typeSlug))
        .map((rule) => rule.childMatchField)
      return [
        source.sourceId,
        (loadedSourceRecords[source.sourceId]?.records ?? []).map((record) => [
          record.provenance.externalId,
          childFields.map((field) => getRelationshipMatchValue({
            record,
            objectTypeUuid: objectType?.uuid ?? '',
            objectTypeSlug: objectType?.slug ?? source.typeSlug,
          }, field)),
        ]),
      ]
    }),
  }), [
    auth.user?.profile.sub,
    contextState.object_type_by_slug,
    contextState.object_type_by_uuid,
    existingParentLookupRules,
    loadedSourceRecords,
    sources,
  ])
  const existingParentCandidates = useMemo(
    () => existingParentLookup.key === existingParentLookupKey
      ? existingParentLookup.candidates
      : [],
    [existingParentLookup, existingParentLookupKey]
  )
  const isResolvingParents = Boolean(auth.user?.access_token) &&
    existingParentLookupRules.length > 0 && existingParentLookup.key !== existingParentLookupKey

  useEffect(() => {
    const token = auth.user?.access_token
    if (!token || existingParentLookupRules.length === 0) return
    const controller = new AbortController()
    void (async () => {
      try {
        const loadedCandidates = sources.flatMap((source) => {
          const objectType = source.selectedObjectTypeUuid
            ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
            : contextState.object_type_by_slug[source.typeSlug]
          return (loadedSourceRecords[source.sourceId]?.records ?? []).map((record) => ({
            record,
            objectTypeUuid: objectType?.uuid ?? '',
            objectTypeSlug: objectType?.slug ?? source.typeSlug,
          }))
        }).filter((candidate) => candidate.objectTypeUuid)
        const existingByUuid = new Map<string, ImportRelationshipCandidate>()
        for (const rule of existingParentLookupRules) {
          const parentType = contextState.object_type_by_slug[rule.parentObjectTypeSlug]
          if (!parentType) continue
          const uploadedParentValues = new Set(
            loadedCandidates
              .filter((candidate) => candidate.objectTypeSlug === rule.parentObjectTypeSlug)
              .map((candidate) => getRelationshipMatchValue(candidate, rule.parentMatchField))
              .filter((value): value is string => Boolean(value))
          )
          const lookupValues = Array.from(new Set(
            loadedCandidates
              .filter((candidate) => candidate.objectTypeSlug === rule.childObjectTypeSlug)
              .map((candidate) => getRelationshipMatchValue(candidate, rule.childMatchField))
              .filter(
                (value): value is string =>
                  value !== undefined && value.length > 0 && !uploadedParentValues.has(value)
              )
          ))
          if (lookupValues.length === 0) continue
          const documents = await fetchDocumentsByDataFieldValues({
            objectTypeUuid: parentType.uuid,
            fieldPath: rule.parentMatchField!,
            values: lookupValues,
            token,
            signal: controller.signal,
          })
          for (const document of documents) {
            existingByUuid.set(document.uuid, {
              objectTypeUuid: parentType.uuid,
              objectTypeSlug: parentType.slug,
              existingDocumentUuid: document.uuid,
              record: {
                uuid: document.uuid,
                slug: document.slug,
                label: document.label,
                description: document.description ?? '',
                data: document.data ?? {},
                attrs: document.attrs ?? {},
                sourceData: document.data,
                provenance: { sourceId: `existing:${document.uuid}`, externalId: document.uuid },
              } as CanonicalImportRecord,
            })
          }
        }
        if (!controller.signal.aborted) {
          setRelationshipError(undefined)
          setExistingParentLookup({
            key: existingParentLookupKey,
            candidates: Array.from(existingByUuid.values()),
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setExistingParentLookup({ key: existingParentLookupKey, candidates: [] })
          setRelationshipError(error instanceof Error ? error.message : String(error))
        }
      }
    })()
    return () => controller.abort()
  }, [
    auth.user?.access_token,
    contextState.object_type_by_slug,
    contextState.object_type_by_uuid,
    existingParentLookupKey,
    existingParentLookupRules,
    loadedSourceRecords,
    sources,
  ])

  const effectiveLoadedSourceRecords = useMemo(() => Object.fromEntries(
    Object.entries(loadedSourceRecords).map(([sourceId, loaded]) => [
      sourceId,
      {
        candidates: loaded.candidates.filter((candidate) => {
          const source = sources.find((item) => item.sourceId === sourceId)
          if (!source) return true
          const objectType = source.selectedObjectTypeUuid
            ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
            : contextState.object_type_by_slug[source.typeSlug]
          const key = `${objectType?.uuid ?? source.typeSlug}:${candidate.provenance.sourceId}:${candidate.provenance.externalId}`
          return !ignoredRelationshipRows.has(key)
        }),
        records: loaded.records.filter((record) => {
          const source = sources.find((candidate) => candidate.sourceId === sourceId)
          if (!source) return true
          const objectType = source.selectedObjectTypeUuid
            ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
            : contextState.object_type_by_slug[source.typeSlug]
          const key = `${objectType?.uuid ?? source.typeSlug}:${record.provenance.sourceId}:${record.provenance.externalId}`
          return !ignoredRelationshipRows.has(key)
        }),
      },
    ])
  ), [contextState.object_type_by_slug, contextState.object_type_by_uuid, ignoredRelationshipRows, loadedSourceRecords, sources])

  const csvRelationshipPlans = useMemo<ImportRelationshipPlan[]>(() => {
    const documentSources = getCSVDocumentSources(sources).filter(
      (source) => source.role !== 'array'
    )
    const objectTypes = new Map<string, IObjectType>(
      documentSources
        .map((source) => {
          const objectType = source.selectedObjectTypeUuid
            ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
            : contextState.object_type_by_slug[source.typeSlug]
          return objectType ? ([objectType.uuid, objectType] as const) : undefined
        })
        .filter((entry): entry is readonly [string, IObjectType] => Boolean(entry))
    )
    for (const rule of resolvedRelationshipRules) {
      const parentType = contextState.object_type_by_slug[rule.parentObjectTypeSlug]
      if (parentType) objectTypes.set(parentType.uuid, parentType)
    }
    const candidates = documentSources.flatMap((source) => {
      const objectType = source.selectedObjectTypeUuid
        ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
        : contextState.object_type_by_slug[source.typeSlug]
      const records = effectiveLoadedSourceRecords[source.sourceId]?.records ?? []
      return objectType
        ? records.map((record) => ({
          record,
          objectTypeUuid: objectType.uuid,
          objectTypeSlug: objectType.slug,
        }))
        : []
    })
    return planImportRelationships({
      parentObjectTypes: objectTypes,
      candidates: [...candidates, ...existingParentCandidates],
      relationshipRules: resolvedRelationshipRules,
    })
  }, [
    contextState.object_type_by_slug,
    contextState.object_type_by_uuid,
    effectiveLoadedSourceRecords,
    existingParentCandidates,
    resolvedRelationshipRules,
    sources,
  ])
  const resolvedCSVRelationshipPlans = useMemo(
    () => csvRelationshipPlans.map((plan) => {
      if (plan.status !== 'ambiguous-parent') return plan
      const selectedParentKey = selectedRelationshipParents[importRelationshipKey(plan)]
      const selectedParent = plan.parentChoices?.find(
        (parent) =>
          (parent.existingDocumentUuid ?? relationshipDocumentKey(parent)) === selectedParentKey
      )
      return selectedParent
        ? { ...plan, parent: selectedParent, status: 'ready' as const, reason: undefined }
        : plan
    }),
    [csvRelationshipPlans, selectedRelationshipParents]
  )
  const cleanImportControlActive =
    documentSourcesInDependencyOrder.length > 0 &&
    documentSourcesInDependencyOrder.every((source) => source.startAtImport)
  const canImportCleanSession =
    cleanImportControlActive &&
    documentSourcesInDependencyOrder.every((source) => {
      const session = importSessions[source.sourceId]
      return Boolean(
        session &&
        isValidationComplete(session) &&
        Object.values(session.validationResults).every(({ isValid }) => isValid) &&
        session.reconciliations &&
        session.reconciliations.every(
          ({ status, action }) =>
            status !== 'ambiguous' && action !== undefined
        )
      )
    }) &&
    resolvedCSVRelationshipPlans.every(({ status }) => status === 'ready')
  const readySessionRecordCount = documentSourcesInDependencyOrder.reduce((total, source) => {
    const reconciliations = importSessions[source.sourceId]?.reconciliations ?? []
    return total + reconciliations.filter(
      ({ status, action }) => status !== 'ambiguous' && action !== undefined && action !== 'ignore'
    ).length
  }, 0)

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
    configuredSource?: CSVImportSourceConfig,
    workbookFileName?: string
  ) => {
    setCompletedSourceIds(new Set())
    const sourceConfig = configuredSource ?? resolveCSVImportSourceConfig(effectiveViewConfig, fileName)
    const schemaChoiceValue = sourceConfig.schemaChoice
      ? schemaChoiceValues[sourceConfig.schemaChoice.key]
      : undefined
    const choiceSource = { config: sourceConfig, schemaChoiceValue }
    const role = resolveCSVImportSourceRole(effectiveViewConfig, sourceConfig)
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
      )).filter(([, fieldPath]) => fieldPath !== sourceConfig.schemaChoice?.valuePath)
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
      workbookFileName,
      schemaChoiceValue,
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
    setUploadKey((key) => key + 1)
  }

  const handleWorkbookSelected = async (file?: File) => {
    if (!file) return
    setIsReadingWorkbook(true)
    setLoadError(undefined)
    setPendingWorkbook(undefined)
    setActiveWorkbookFileName(undefined)
    setSchemaChoiceValues({})
    setSelectedWorkbookTypes({})
    try {
      const { parseWorkbookFile } = await import('../workbook')
      const sheets = await parseWorkbookFile(file)
      if (sheets.length === 0) throw new Error('The workbook has no worksheets with headers.')
      setPendingWorkbook({ fileName: file.name, sheets })
      setActiveWorkbookFileName(file.name)
      setSelectedWorkbookSheets(new Set(sheets.map(({ name }) => name)))
    } catch (error) {
      setLoadError(formatCSVRecordsError(error))
    } finally {
      setIsReadingWorkbook(false)
      if (workbookInputRef.current) workbookInputRef.current.value = ''
    }
  }

  const resolveWorkbookSheetSourceConfig = (sheetName: string): CSVImportSourceConfig => {
    const sheetFileName = `${sheetName}.csv`
    const configuredSource = sourceConfigs.find(
      (sourceConfig) =>
        sourceConfig.fileName?.toLowerCase() === sheetFileName.toLowerCase() ||
        sourceConfig.key === csvFileNameToTypeSlug(sheetFileName)
    )
    const sourceConfig = configuredSource ?? resolveCSVImportSourceConfig(effectiveViewConfig, sheetFileName)
    const selectedTypeUuid = selectedWorkbookTypes[sheetName]
    if (selectedTypeUuid === undefined) return sourceConfig
    const selectedType = selectedTypeUuid
      ? contextState.object_type_by_uuid[selectedTypeUuid]
      : undefined
    return {
      ...sourceConfig,
      typeSlug: selectedType?.slug ?? (
        sourceConfig.arrayTarget ? sourceConfig.typeSlug : csvFileNameToTypeSlug(sheetFileName)
      ),
      typeKnown: Boolean(selectedType),
    }
  }
  const selectedWorkbookSheetsMissingChoices = pendingWorkbook?.sheets.some((sheet) => {
    if (!selectedWorkbookSheets.has(sheet.name)) return false
    const choiceKey = resolveWorkbookSheetSourceConfig(sheet.name).schemaChoice?.key
    return Boolean(choiceKey && !schemaChoiceValues[choiceKey])
  }) ?? false
  const availableObjectTypes = Object.values(contextState.object_type_by_uuid).sort(
    (left, right) => left.label.localeCompare(right.label)
  )

  const addSelectedWorkbookSheets = () => {
    if (!pendingWorkbook) return
    for (const sheet of selectWorkbookSheets(pendingWorkbook.sheets, selectedWorkbookSheets)) {
      const sheetFileName = `${sheet.name}.csv`
      addSource(
        sheet.text,
        sheet.parsed,
        sheetFileName,
        resolveWorkbookSheetSourceConfig(sheet.name),
        pendingWorkbook.fileName
      )
    }
    setActiveWorkbookFileName(pendingWorkbook.fileName)
    setPendingWorkbook(undefined)
    setSelectedWorkbookSheets(new Set())
  }

  const removeCurrentWorkbook = () => {
    const workbookFileName = activeWorkbookFileName ?? pendingWorkbook?.fileName
    const removedSourceIds = new Set(
      sources
        .filter((source) => source.workbookFileName === workbookFileName)
        .map((source) => source.sourceId)
    )
    setSources((current) => current.filter((source) => !removedSourceIds.has(source.sourceId)))
    setUploadedImportSources((current) =>
      current.filter((source) => !removedSourceIds.has(source.sourceAdapter.id))
    )
    setLoadedSourceRecords((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([sourceId]) => !removedSourceIds.has(sourceId))
      )
    )
    setCompletedSourceIds((current) =>
      new Set(Array.from(current).filter((sourceId) => !removedSourceIds.has(sourceId)))
    )
    setActiveSourceId((current) => current && removedSourceIds.has(current) ? null : current)
    setPendingWorkbook(undefined)
    setSelectedWorkbookSheets(new Set())
    setSelectedWorkbookTypes({})
    setSchemaChoiceValues({})
    setActiveWorkbookFileName(undefined)
    setRelationshipResults([])
    setSelectedRelationshipParents({})
    setIgnoredRelationshipRows(new Set())
    setRelationshipError(undefined)
    setStep('upload')
    setActiveWizardStep('upload')
    setUploadKey((current) => current + 1)
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

  const continueToRecords = async (fromUpload = false) => {
    if (!activeSource) return
    if (fromUpload && !inferredMappingsAreConfident) {
      setLoadError('Some columns need mapping review. Confirm the mappings, then continue.')
      setActiveWizardStep('mapping')
      return
    }
    setIsLoadingRecords(true)
    setLoadError(undefined)
    try {
      if (sources.some((source) => source.role === 'array')) {
        const missingArrayParents = sources
          .filter((source) => source.role === 'array')
          .filter(
            (source) =>
              !source.arrayTarget?.parentSourceKey ||
              !sources.some(
                (candidate) => candidate.config.key === source.arrayTarget?.parentSourceKey
              )
          )
        if (missingArrayParents.length > 0) {
          throw new Error(
            `Upload the configured document source before importing array rows: ${missingArrayParents
              .map((source) => source.fileName)
              .join(', ')}`
          )
        }
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
            return {
              source: { ...source, sourceKey: source.config.key },
              candidates,
              records,
            }
          })
        )
        const composedSources = loadedSources.map((loaded) =>
          loaded.source.arrayTarget
            ? loaded
            : {
              ...loaded,
              records: mergeCSVArraySources({
                parentSourceId: loaded.source.sourceId,
                loadedSources,
              }),
            }
        )
        const readySourceIds = new Set(
          composedSources
            .filter(({ source, records }) => canSourceStartAtImport(source, records))
            .map(({ source }) => source.sourceId)
        )
        setSources((current) =>
          current.map((source) => ({
            ...source,
            startAtImport: readySourceIds.has(source.sourceId),
          }))
        )
        const parentLoaded = composedSources.find(
          (loaded) => loaded.source.sourceId === parentSource.sourceId
        )
        if (!parentLoaded) throw new Error('The parent CSV source could not be loaded.')

        setLoadedSourceRecords(
          Object.fromEntries(
            composedSources.map(({ source, candidates, records }) => [
              source.sourceId,
              { candidates, records },
            ])
          )
        )

        parentSession.resetSession()
        parentSession.setCandidates(parentLoaded.candidates)
        parentSession.setRecords(parentLoaded.records)
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
            validateCSVRecords(parentLoaded.records, existingSchema as JSONSchema6)
          )
        }
        setActiveSourceId(parentSource.sourceId)
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
      setLoadedSourceRecords((current) => ({
        ...current,
        [activeSource.sourceId]: { candidates, records },
      }))
      activeSession.resetSession()
      activeSession.setCandidates(candidates)
      activeSession.setRecords(records)
      const existingType = activeSource.selectedObjectTypeUuid
        ? contextState.object_type_by_uuid[activeSource.selectedObjectTypeUuid]
        : contextState.object_type_by_slug[activeSource.typeSlug]
      const existingSchema = existingType
        ? contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]?.json_schema
        : undefined
      if (existingType && existingSchema) {
        activeSession.setSelectedObjectType(existingType)
        activeSession.setSchema(existingSchema)
        activeSession.setValidationResults(
          validateCSVRecords(records, existingSchema as JSONSchema6)
        )
      }
      setStep('records')
      setActiveWizardStep('import')
    } catch (error) {
      setLoadError(formatCSVRecordsError(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const linkCSVRelationships = useCallback(async () => {
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
        plans: resolvedCSVRelationshipPlans,
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
  }, [
    contextState.object_type_by_slug,
    contextState.object_type_by_uuid,
    contextState.predicate_by_predicate,
    contextState.predicate_by_uuid,
    csvRelationshipPlans.length,
    auth.user,
    loadedSourceRecords,
    resolvedCSVRelationshipPlans,
    sources,
  ])

  useEffect(() => {
    if (importRequest === 0) {
      autoLinkedImportRequest.current = 0
      return
    }
    const sourceIds = documentSourcesInDependencyOrder.map((source) => source.sourceId)
    if (
      sourceIds.length === 0 ||
      !sourceIds.every((sourceId) => completedSourceIds.has(sourceId)) ||
      autoLinkedImportRequest.current === importRequest
    ) return
    autoLinkedImportRequest.current = importRequest
    void linkCSVRelationships()
  }, [completedSourceIds, documentSourcesInDependencyOrder, importRequest, linkCSVRelationships])

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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto pr-4">
          <section className="pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Import data files</h1>
                <p className="text-sm text-gray-600">
                  {uploadFormat === 'xlsx'
                    ? 'Select a workbook, then choose its worksheet sources.'
                    : uploadFormat === 'csv'
                      ? `${sourceCountLabel}. Each file keeps its own mapping and import session.`
                      : 'Choose an upload format to begin.'}
                </p>
              </div>
              <FileSpreadsheet size={22} />
            </div>
            <div className="mb-4 inline-flex border" role="group" aria-label="Upload format">
              <Button
                variant={uploadFormat === 'csv' ? 'default' : 'outline'}
                aria-pressed={uploadFormat === 'csv'}
                disabled={sources.length > 0 || Boolean(pendingWorkbook)}
                onClick={() => setUploadFormat('csv')}
              >
                CSV files
              </Button>
              <Button
                variant={uploadFormat === 'xlsx' ? 'default' : 'outline'}
                aria-pressed={uploadFormat === 'xlsx'}
                disabled={sources.length > 0 || Boolean(pendingWorkbook)}
                onClick={() => setUploadFormat('xlsx')}
              >
                Excel workbook (.xlsx)
              </Button>
            </div>
            {uploadFormat === 'xlsx' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    variant="outline"
                    disabled={isReadingWorkbook || (sources.length > 0 && Boolean(activeWorkbookFileName))}
                    onClick={() => workbookInputRef.current?.click()}
                  >
                    <FileSpreadsheet size={16} />
                    Choose file
                  </Button>
                  <input
                    ref={workbookInputRef}
                    className="sr-only"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    aria-label="Choose Excel workbook"
                    onChange={(event) => void handleWorkbookSelected(event.target.files?.[0])}
                  />
                  <span className="min-w-0 truncate text-sm text-gray-600" title={activeWorkbookFileName}>
                    {activeWorkbookFileName ?? 'No workbook selected'}
                  </span>
                  {isReadingWorkbook && (
                    <span className="text-xs text-gray-600" role="status">
                      Reading workbook...
                    </span>
                  )}
                </div>
                {activeWorkbookFileName && (
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={isReadingWorkbook}
                    aria-label="Remove workbook and all sheets"
                    title="Remove workbook and all sheets"
                    onClick={removeCurrentWorkbook}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            )}
            {uploadFormat && (
              <>
                {(uploadFormat === 'csv' || sources.length > 0) &&
                  sourceConfigs.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {sourceConfigs.map((sourceConfig) => {
                      const uploadedSource = sources.find(
                        (source) => source.config.key === sourceConfig.key
                      )
                      const choice = viewConfig.schemaChoices?.find(
                        (candidate) => candidate.key === sourceConfig.schemaChoice?.key
                      )
                      const selectedChoice = sourceConfig.schemaChoice
                        ? schemaChoiceValues[sourceConfig.schemaChoice.key]
                        : undefined
                      const choiceRequired = Boolean(sourceConfig.schemaChoice && !selectedChoice)
                      return (
                        <section
                          key={sourceConfig.key}
                          className="grid gap-2 border px-3 py-2 md:grid-cols-[minmax(12rem,1fr)_minmax(22rem,32rem)] md:items-center"
                          aria-label={sourceConfig.label}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-semibold">{sourceConfig.label}</h2>
                              {sourceConfig.optional && (
                                <span className="text-xs text-gray-500">Optional</span>
                              )}
                            </div>
                            {sourceConfig.description && (
                              <p className="truncate text-xs text-gray-600" title={sourceConfig.description}>
                                {sourceConfig.description}
                              </p>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-3">
                            {choice && (
                              <label
                                className={`flex min-w-0 items-center gap-2 text-xs ${choiceRequired ? 'text-amber-950' : ''
                                  }`}
                              >
                                {choice.showLabel !== false && (
                                  <span className="font-semibold">
                                    {choice.label}
                                    {choiceRequired && <span className="ml-1 text-red-700">Required</span>}
                                  </span>
                                )}
                                <select
                                  className={`h-8 w-auto max-w-80 border px-1 text-xs ${choiceRequired
                                    ? 'border-amber-700 bg-amber-50 ring-2 ring-amber-200'
                                    : 'bg-white'
                                    }`}
                                  value={schemaChoiceValues[choice.key] ?? ''}
                                  aria-label={choice.label}
                                  aria-required="true"
                                  aria-invalid={choiceRequired}
                                  disabled={sources.some(
                                    (source) => source.config.schemaChoice?.key === choice.key
                                  )}
                                  onChange={(event) =>
                                    setSchemaChoiceValues((current) => ({
                                      ...current,
                                      [choice.key]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">{choice.placeholder}</option>
                                  {choice.options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {sourceConfig.schemaChoice && !selectedChoice ? (
                              <p className="text-xs font-medium text-amber-900" role="status">
                                Required to continue. Choose {choice?.label.toLowerCase() ?? 'an option'}.
                              </p>
                            ) : uploadFormat === 'csv' ? (
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
                            ) : (
                              !uploadedSource && (
                                <p className="text-xs text-gray-600" role="status">
                                  Select a matching worksheet to add this source.
                                </p>
                              )
                            )}
                            {uploadedSource && (
                              <p className="text-xs text-green-700">
                                Using {uploadedSource.fileName} for this source.
                              </p>
                            )}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                ) : uploadFormat === 'csv' ? (
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
                ) : null}
                {uploadFormat === 'xlsx' && pendingWorkbook && (
                  <div className="mt-4 pt-4">
                    {pendingWorkbook && (
                      <div className="mt-3 max-w-full border p-3">
                        <div className="mb-2 text-sm font-semibold">{pendingWorkbook.fileName}</div>
                        <div className="max-h-64 overflow-auto">
                          <div className="min-w-full">
                            {pendingWorkbook.sheets.map((sheet, index) => {
                              const sourceConfig = resolveWorkbookSheetSourceConfig(sheet.name)
                              const defaultTypeUuid = sourceConfig.typeKnown
                                ? contextState.object_type_by_slug[sourceConfig.typeSlug]?.uuid ?? ''
                                : ''
                              const assumedTypeUuid = selectedWorkbookTypes[sheet.name] ?? defaultTypeUuid
                              const assumedObjectType = assumedTypeUuid
                                ? contextState.object_type_by_uuid[assumedTypeUuid]
                                : undefined
                              const assumedType = assumedObjectType
                                ? sourceConfig.arrayTarget
                                  ? `${assumedObjectType.slug}.${sourceConfig.arrayTarget.arrayFieldPath}[]`
                                  : assumedObjectType.slug
                                : 'None'
                              const schemaChoice = sourceConfig.schemaChoice
                                ? viewConfig.schemaChoices?.find(
                                  (choice) => choice.key === sourceConfig.schemaChoice?.key
                                )
                                : undefined
                              return (
                                <div
                                  key={sheet.name}
                                  className="px-3 py-2 text-sm"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <input
                                      id={`workbook-sheet-${index}`}
                                      type="checkbox"
                                      checked={selectedWorkbookSheets.has(sheet.name)}
                                      onChange={(event) =>
                                        setSelectedWorkbookSheets((current) => {
                                          const next = new Set(current)
                                          if (event.target.checked) next.add(sheet.name)
                                          else next.delete(sheet.name)
                                          return next
                                        })
                                      }
                                    />
                                    <label
                                      htmlFor={`workbook-sheet-${index}`}
                                      className="min-w-0 truncate font-medium"
                                    >
                                      {sheet.name}
                                    </label>
                                  </div>
                                  <div className="mt-1 flex min-w-0 flex-wrap items-start gap-3">
                                    <span className="pt-1 text-xs text-gray-600">
                                      {sheet.parsed.data.length} rows
                                    </span>
                                    {schemaChoice && sourceConfig.schemaChoice ? (
                                      <label
                                        className={`flex w-fit max-w-full items-center gap-2 text-xs ${!schemaChoiceValues[sourceConfig.schemaChoice.key]
                                          ? 'text-amber-950'
                                          : ''
                                          }`}
                                      >
                                        {schemaChoice.showLabel !== false && (
                                          <span className="truncate font-semibold">
                                            {schemaChoice.label}
                                            {!schemaChoiceValues[sourceConfig.schemaChoice.key] && (
                                              <span className="ml-1 text-red-700">Required</span>
                                            )}
                                          </span>
                                        )}
                                        <select
                                          className={`h-8 w-auto max-w-80 border px-1 text-xs ${!schemaChoiceValues[sourceConfig.schemaChoice.key]
                                            ? 'border-amber-700 bg-amber-50 ring-2 ring-amber-200'
                                            : 'bg-white'
                                            }`}
                                          aria-label={`${schemaChoice.label} for ${sheet.name}`}
                                          aria-required="true"
                                          aria-invalid={!schemaChoiceValues[sourceConfig.schemaChoice.key]}
                                          value={schemaChoiceValues[sourceConfig.schemaChoice.key] ?? ''}
                                          onChange={(event) =>
                                            setSchemaChoiceValues((current) => ({
                                              ...current,
                                              [sourceConfig.schemaChoice!.key]: event.target.value,
                                            }))
                                          }
                                        >
                                          <option value="">{schemaChoice.placeholder}</option>
                                          {schemaChoice.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    ) : <span />}
                                    <div className="min-w-0">
                                      <label className="flex w-fit max-w-full items-center gap-2 text-xs">
                                        <span>Assumed type</span>
                                        <select
                                          className="h-8 w-auto max-w-80 border bg-white px-1 text-xs"
                                          aria-label={`Assumed type for ${sheet.name}`}
                                          value={assumedTypeUuid}
                                          onChange={(event) =>
                                            setSelectedWorkbookTypes((current) => ({
                                              ...current,
                                              [sheet.name]: event.target.value,
                                            }))
                                          }
                                        >
                                          <option value="">None</option>
                                          {availableObjectTypes.map((objectType) => (
                                            <option key={objectType.uuid} value={objectType.uuid}>
                                              {objectType.label} ({objectType.slug})
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <span
                                        className="mt-1 block w-full truncate text-xs text-gray-600"
                                        title={`Resolved as: ${assumedType}`}
                                      >
                                        Resolved as: {assumedType}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          {selectedWorkbookSheetsMissingChoices && (
                            <p className="text-xs font-medium text-amber-900" role="status">
                              Select the required option for every selected sheet to enable Add.
                            </p>
                          )}
                          <div className="ml-auto flex gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={removeCurrentWorkbook}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              disabled={selectedWorkbookSheets.size === 0 || selectedWorkbookSheetsMissingChoices}
                              title={selectedWorkbookSheetsMissingChoices
                                ? 'Select the required option for every selected sheet first'
                                : undefined}
                              onClick={addSelectedWorkbookSheets}
                            >
                              Add {selectedWorkbookSheets.size} selected sheets
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {sources.length > 0 && (
            <section className="pb-4" aria-label="CSV sources">
              <details
                open={isSourceSetupExpanded}
                onToggle={(event) =>
                  setSourceSetupDisclosure({
                    complete: sourceSetupIsComplete,
                    expanded: event.currentTarget.open,
                  })
                }
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <h2 className="font-semibold">CSV sources ({sources.length})</h2>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`transition-transform ${isSourceSetupExpanded ? 'rotate-180' : ''}`}
                  />
                  <span className="text-sm text-gray-600">
                    {sourceSetupIsComplete
                      ? 'Source types and relationships configured'
                      : 'Review source types and relationships'}
                  </span>
                </summary>
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
                        <div className="basis-full pt-3 text-sm">
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
                        <div className="basis-full pt-3 text-sm">
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
              </details>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={!canPrepareImport || isLoadingRecords}
                  onClick={() => setActiveWizardStep('mapping')}
                >
                  Review mappings
                </Button>
                <Button
                  disabled={!canPrepareImport || isLoadingRecords}
                  onClick={() => void continueToRecords(true)}
                >
                  {isLoadingRecords ? 'Preparing import...' : 'Prepare import'}
                </Button>
              </div>
            </section>
          )}

          {loadError && (
            <div className="whitespace-pre-line wrap-break-word text-sm text-red-700" role="alert">
              {loadError}
            </div>
          )}
        </div>
      )}

      {activeWizardStep === 'mapping' && activeSource && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-4">
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
                        viewConfig={effectiveViewConfig}
                        onChange={(update) => updateSource(source.sourceId, update)}
                      />
                      {viewConfig.relationships === 'fixed' && (
                        <CSVSourceEditor
                          source={source}
                          sources={sources}
                          mode="relationships"
                          viewConfig={effectiveViewConfig}
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
                viewConfig={effectiveViewConfig}
                onChange={(update) => updateSource(activeSource.sourceId, update)}
              />
              {viewConfig.relationships === 'fixed' && (
                <CSVSourceEditor
                  source={activeSource}
                  sources={sources}
                  mode="relationships"
                  viewConfig={effectiveViewConfig}
                  onChange={(update) => updateSource(activeSource.sourceId, update)}
                />
              )}
            </>
          ) : null}
          {loadError && (
            <div className="whitespace-pre-line wrap-break-word text-sm text-red-700" role="alert">
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
        <div className="flex min-h-0 flex-1 flex-col pr-4">
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
            <div className="flex items-center gap-2">
              {cleanImportControlActive && (
                <Button
                  size="xs"
                  disabled={
                    sessionImportStarted || !canImportCleanSession || readySessionRecordCount === 0
                  }
                  onClick={() => {
                    setSessionImportStarted(true)
                    setCompletedSourceIds(new Set())
                    setImportRequest((request) => request + 1)
                  }}
                >
                  {sessionImportStarted ? 'Import started' : `Import ${readySessionRecordCount} records`}
                </Button>
              )}
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setSessionImportStarted(false)
                  setImportRequest(0)
                  setActiveWizardStep('upload')
                }}
              >
                Back to CSV sources
              </Button>
            </div>
          </div>
          {resolvedRelationshipRules.length > 0 && (
            <section className="mb-3 border-b pb-3" aria-label="CSV relationship review">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <strong>{viewConfig.relationshipPresentation === 'guided' ? 'Relationships' : 'CSV relationship review'}</strong>
                {viewConfig.relationshipPresentation === 'guided' ? (
                  <span>
                    {resolvedCSVRelationshipPlans.filter(({ status }) => status !== 'ready').length === 0
                      ? 'All parent matches are resolved'
                      : `${resolvedCSVRelationshipPlans.filter(({ status }) => status !== 'ready').length} rows need attention`}
                  </span>
                ) : (
                  <>
                    <span>
                      {resolvedCSVRelationshipPlans.filter(({ status }) => status === 'ready').length} ready
                    </span>
                    <span>
                      {resolvedCSVRelationshipPlans.filter(({ status }) => status !== 'ready').length} need resolution
                    </span>
                    <span>{existingParentCandidates.length} existing parent matches</span>
                  </>
                )}
                {ignoredRelationshipRows.size > 0 && (
                  <>
                    <span>{ignoredRelationshipRows.size} rows ignored</span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setIgnoredRelationshipRows(new Set())}
                    >
                      Restore ignored rows
                    </Button>
                  </>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  disabled={
                    isLinkingRelationships ||
                    isResolvingParents ||
                    !documentSourcesInDependencyOrder.every((source) =>
                      completedSourceIds.has(source.sourceId)
                    ) ||
                    resolvedCSVRelationshipPlans.length === 0 ||
                    resolvedCSVRelationshipPlans.some(({ status }) => status !== 'ready')
                  }
                  onClick={() => void linkCSVRelationships()}
                >
                  {isLinkingRelationships ? 'Linking relationships...' : 'Link relationships'}
                </Button>
              </div>
              {isResolvingParents && (
                <p className="mt-2 text-sm text-gray-600" role="status">
                  Checking existing parent documents...
                </p>
              )}
              {resolvedCSVRelationshipPlans
                .filter(({ status }) => status !== 'ready')
                .map((plan) => {
                  const planKey = importRelationshipKey(plan)
                  return (
                    <div
                      key={planKey}
                      className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-sm"
                    >
                      <span className="min-w-0 flex-1">
                        {plan.child.record.label}: {plan.reason ?? `Relationship is ${plan.status}.`}
                      </span>
                      {plan.status === 'ambiguous-parent' && (
                        <label className="flex items-center gap-2">
                          <span className="sr-only">Choose parent for {plan.child.record.label}</span>
                          <select
                            className="h-8 max-w-64 border bg-white px-2"
                            value={selectedRelationshipParents[planKey] ?? ''}
                            onChange={(event) =>
                              setSelectedRelationshipParents((current) => ({
                                ...current,
                                [planKey]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Choose matching parent</option>
                            {(plan.parentChoices ?? []).map((parent) => {
                              const key = parent.existingDocumentUuid ?? relationshipDocumentKey(parent)
                              return (
                                <option key={key} value={key}>
                                  {parent.record.label} ({parent.record.slug})
                                </option>
                              )
                            })}
                          </select>
                        </label>
                      )}
                      {(plan.status === 'missing-parent' || plan.status === 'ambiguous-parent') && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setActiveWizardStep('upload')}
                        >
                          Add parent source
                        </Button>
                      )}
                      {plan.status === 'missing-parent' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setIgnoredRelationshipRows((current) =>
                              new Set(current).add(relationshipDocumentKey(plan.child))
                            )
                          }
                        >
                          Ignore child row
                        </Button>
                      )}
                    </div>
                  )
                })}
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
              {viewConfig.relationshipPresentation !== 'guided' && <details className="mt-3 border bg-gray-50 p-2 text-xs">
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
                      plans: resolvedCSVRelationshipPlans.map((plan) => ({
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
              </details>}
            </section>
          )}
          <div className="min-h-0 flex-1 overflow-auto">
            <div role="table" aria-label="CSV import sources" className="min-w-0">
              <div
                role="row"
                className="hidden grid-cols-[minmax(12rem,1.3fr)_minmax(10rem,1fr)_minmax(13rem,1fr)_auto] gap-3 border-b py-2 text-xs font-semibold text-gray-600 xl:grid"
              >
                <span role="columnheader">Type</span>
                <span role="columnheader">Valid / invalid</span>
                <span role="columnheader">Duplicate handling</span>
                <span role="columnheader" className="sr-only">Actions</span>
              </div>
              {documentSourcesInDependencyOrder.map((source) => {
                const objectType = source.selectedObjectTypeUuid
                  ? contextState.object_type_by_uuid[source.selectedObjectTypeUuid]
                  : contextState.object_type_by_slug[source.typeSlug]
                const schema = objectType
                  ? (contextState.object_schema_defaults_by_object_type_uuid[objectType.uuid]
                    ?.json_schema as JSONSchema6 | undefined)
                  : undefined
                const pendingDependencies = (executionDependencies.get(source.sourceId) ?? [])
                  .filter((dependencyId) => !completedSourceIds.has(dependencyId))
                const pendingFiles = pendingDependencies.map(
                  (dependencyId) =>
                    sources.find((candidate) => candidate.sourceId === dependencyId)?.fileName ??
                    dependencyId
                )
                const unresolvedRelationship = resolvedCSVRelationshipPlans.some(
                  (plan) =>
                    plan.child.record.provenance.sourceId === source.sourceId &&
                    plan.status !== 'ready'
                )
                return (
                  <CSVSourceImportPanel
                    key={source.sourceId}
                    source={source}
                    loaded={effectiveLoadedSourceRecords[source.sourceId]}
                    objectType={objectType}
                    schema={schema}
                    executionBlocked={pendingDependencies.length > 0 || unresolvedRelationship}
                    externalImportControl={cleanImportControlActive}
                    startImportRequest={importRequest}
                    executionBlockMessage={
                      pendingFiles.length > 0
                        ? `Import ${pendingFiles.join(', ')} first to preserve parent-child order.`
                        : unresolvedRelationship
                          ? 'Resolve parent matches before importing these rows.'
                          : undefined
                    }
                    onObjectTypeSelected={handleObjectTypeSelected}
                    onImportAttemptComplete={markSourceImportAttemptComplete}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVImportPage
