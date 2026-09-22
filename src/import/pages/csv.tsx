import { useMemo, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FileSpreadsheet, X } from ***REMOVED***lucide-react***REMOVED***
import { schemaToFormUtils, type IFieldInputProps, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import type { ParsedCSV } from ***REMOVED***@/lib/csv***REMOVED***
import FileUpload from ***REMOVED***@/manage/custom_inputs/file_upload***REMOVED***
import {
  createCSVImportAdapter,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  inferCSVImportMapping,
  isCSVImportMappingComplete,
} from ***REMOVED***../csv_adapter***REMOVED***
import type { CSVImportMapping } from ***REMOVED***../csv_adapter***REMOVED***
import type { ImportSourceAdapter } from ***REMOVED***../types***REMOVED***
import ImportRecordsPage from ***REMOVED***./index***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { useImportSession } from ***REMOVED***../state/importState***REMOVED***
import contextStateAtom from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

const csvField = {
  id: ***REMOVED***csv-file***REMOVED***,
  label: ***REMOVED***CSV file***REMOVED***,
  description: ***REMOVED***Upload CSV files to preview and import them as independent sources.***REMOVED***,
} as IFieldInputProps[***REMOVED***field***REMOVED***]

type CSVImportSource = {
  sourceId: string
  typeSlug: string
  fileName: string
  fileText: string
  parsed: ParsedCSV
  mapping: CSVImportMapping
  adapter: ImportSourceAdapter
  startAtImport: boolean
}

const createSourceId = (typeSlug: string, sourceNumber: number): string =>
  `${typeSlug}-${sourceNumber}`

const CSVSourceEditor = ({
  source,
  onChange,
}: {
  source: CSVImportSource
  onChange: (update: Partial<CSVImportSource>) => void
}): ReactElement => {
  const updateMapping = (mapping: CSVImportMapping) => {
    onChange({
      mapping,
      adapter: createCSVImportAdapter({
        id: source.sourceId,
        label: csvFileNameToTypeLabel(source.fileName),
        text: source.fileText,
        mapping,
      }),
      startAtImport: false,
    })
  }

  return (
    <>
      <section className="min-w-0 shrink-0 border-b pb-4" aria-label="CSV preview">
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
                      {String(row[header.key] ?? ***REMOVED******REMOVED***)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="min-w-0 shrink-0 border-b pb-4" aria-label="CSV field mapping">
        <div className="mb-3">
          <h2 className="font-semibold">Map CSV fields</h2>
          <p className="text-sm text-gray-600">
            Confirm which columns become document fields. Unmapped columns remain in document data when selected below.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [***REMOVED***label***REMOVED***, ***REMOVED***Label***REMOVED***],
              [***REMOVED***slug***REMOVED***, ***REMOVED***Slug***REMOVED***],
              [***REMOVED***externalId***REMOVED***, ***REMOVED***External ID***REMOVED***],
              [***REMOVED***description***REMOVED***, ***REMOVED***Description***REMOVED***],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{label}</span>
              <select
                value={source.mapping[field] ?? ***REMOVED******REMOVED***}
                onChange={(event) => {
                  const nextValue = event.target.value || undefined
                  const specialColumns = new Set(
                    [
                      source.mapping.label,
                      source.mapping.slug,
                      source.mapping.externalId,
                      source.mapping.description,
                      nextValue,
                    ].filter((column): column is string => Boolean(column))
                  )
                  updateMapping({
                    ...source.mapping,
                    [field]: nextValue,
                    dataColumns: (source.mapping.dataColumns ?? []).filter(
                      (column) => !specialColumns.has(column)
                    ),
                  })
                }}
                className="border px-2 py-1"
              >
                <option value="">Not mapped</option>
                {source.parsed.headers.map((header) => (
                  <option key={header.key} value={header.key}>{header.key}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {source.parsed.headers.map((header) => {
            const selected = source.mapping.dataColumns?.includes(header.key) ?? false
            return (
              <label key={header.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const dataColumns = new Set(source.mapping.dataColumns ?? [])
                    if (event.target.checked) dataColumns.add(header.key)
                    else dataColumns.delete(header.key)
                    updateMapping({ ...source.mapping, dataColumns: Array.from(dataColumns) })
                  }}
                />
                {header.key}
              </label>
            )
          })}
        </div>
      </section>
    </>
  )
}

const CSVImportPage = (): ReactElement => {
  const [sources, setSources] = useState<CSVImportSource[]>([])
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [step, setStep] = useState<***REMOVED***upload***REMOVED*** | ***REMOVED***records***REMOVED***>(***REMOVED***upload***REMOVED***)
  const [uploadKey, setUploadKey] = useState(0)
  const sourceSequence = useRef(0)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [contextState] = useAtom(contextStateAtom)
  const activeSource = sources.find((source) => source.sourceId === activeSourceId) ?? null
  const activeSession = useImportSession(activeSource?.sourceId ?? ***REMOVED***csv-upload***REMOVED***)
  const sourceCountLabel = useMemo(
    () => `${sources.length} CSV source${sources.length === 1 ? ***REMOVED******REMOVED*** : ***REMOVED***s***REMOVED***}`,
    [sources.length]
  )

  const addSource = (fileData: string, parsed: ParsedCSV, fileName: string) => {
    const typeSlug = csvFileNameToTypeSlug(fileName)
    sourceSequence.current += 1
    const sourceId = createSourceId(typeSlug, sourceSequence.current)
    const mapping = inferCSVImportMapping(parsed.headers.map((header) => header.key))
    const adapter = createCSVImportAdapter({
      id: sourceId,
      label: csvFileNameToTypeLabel(fileName),
      text: fileData,
      mapping,
    })
    const source = {
      sourceId,
      typeSlug,
      fileName,
      fileText: fileData,
      parsed,
      mapping,
      adapter,
      startAtImport: false,
    }
    setSources((current) => [...current, source])
    setActiveSourceId(sourceId)
    setUploadKey((key) => key + 1)
  }

  const updateSource = (sourceId: string, update: Partial<CSVImportSource>) => {
    setSources((current) => current.map((source) =>
      source.sourceId === sourceId ? { ...source, ...update } : source
    ))
  }

  const continueToRecords = async () => {
    if (!activeSource) return
    setIsLoadingRecords(true)
    setLoadError(undefined)
    try {
      activeSession.resetSession()
      const candidates = await activeSource.adapter.discover({
        url: activeSource.adapter.defaultImportUrl,
        signal: new AbortController().signal,
      })
      activeSession.setCandidates(candidates)
      const records = await Promise.all(candidates.map((candidate) => activeSource.adapter.load({ candidate })))
      activeSession.setRecords(records)
      const existingType = contextState.object_type_by_slug[activeSource.typeSlug]
      const existingSchema = existingType
        ? contextState.object_schema_defaults_by_object_type_uuid[existingType.uuid]?.json_schema
        : undefined
      const mappingComplete = isCSVImportMappingComplete(
        activeSource.parsed.headers.map((header) => header.key),
        activeSource.mapping
      )
      const canStartAtImport = Boolean(existingType && existingSchema && mappingComplete)
      if (canStartAtImport && existingType && existingSchema) {
        activeSession.setSelectedObjectType(existingType)
        activeSession.setSchema(existingSchema)
        activeSession.setValidationResults(records.map((record) => {
          const errors = schemaToFormUtils.validateAgainstSchema(
            omit(existingSchema as Record<string, unknown>, ***REMOVED***$schema***REMOVED***),
            record.data as IFormValues
          )
          return {
            record,
            result: { isValid: !errors?.length, errors: errors?.map((error) => error.message) ?? [] },
          }
        }))
      }
      updateSource(activeSource.sourceId, { startAtImport: canStartAtImport })
      setStep(***REMOVED***records***REMOVED***)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      {step === ***REMOVED***upload***REMOVED*** && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto">
          <section className="border-b pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Import CSV files</h1>
                <p className="text-sm text-gray-600">{sourceCountLabel}. Each file keeps its own mapping and import session.</p>
              </div>
              <FileSpreadsheet size={22} />
            </div>
            <FileUpload
              key={uploadKey}
              field={csvField}
              value={null}
              onChange={() => undefined}
              acceptFileTypes={[***REMOVED***csv***REMOVED***, ***REMOVED***text/csv***REMOVED***]}
              onFileUploaded={(fileData, csvData, uploadedFileName) => {
                if (typeof fileData === ***REMOVED***string***REMOVED*** && csvData && uploadedFileName) addSource(fileData, csvData, uploadedFileName)
              }}
            />
          </section>

          {sources.length > 0 && (
            <section className="border-b pb-4" aria-label="CSV sources">
              <h2 className="mb-2 font-semibold">CSV sources</h2>
              <div className="flex flex-col gap-2">
                {sources.map((source) => (
                  <div key={source.sourceId} className="flex items-center gap-2 border px-3 py-2">
                    <Button size="xs" variant={activeSourceId === source.sourceId ? ***REMOVED***default***REMOVED*** : ***REMOVED***outline***REMOVED***} onClick={() => setActiveSourceId(source.sourceId)}>
                      {source.fileName}
                    </Button>
                    <span className="text-xs text-gray-600">{source.parsed.data.length} rows, type {source.typeSlug}</span>
                    <Button
                      size="xs"
                      variant="outline"
                      className="ml-auto"
                      aria-label={`Remove ${source.fileName}`}
                      onClick={() => {
                        const remaining = sources.filter(({ sourceId }) => sourceId !== source.sourceId)
                        setSources(remaining)
                        if (activeSourceId === source.sourceId) setActiveSourceId(remaining[0]?.sourceId ?? null)
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSource && (
            <CSVSourceEditor source={activeSource} onChange={(update) => updateSource(activeSource.sourceId, update)} />
          )}
          {activeSource && (
            <div className="flex justify-end border-t pt-4">
              <Button disabled={isLoadingRecords} onClick={() => void continueToRecords()}>
                {isLoadingRecords ? ***REMOVED***Loading records...***REMOVED*** : `Continue with ${activeSource.fileName}`}
                <FileSpreadsheet size={16} />
              </Button>
            </div>
          )}
          {loadError && <div className="text-sm text-red-700" role="alert">Could not load CSV records: {loadError}</div>}
        </div>
      )}

      {step === ***REMOVED***records***REMOVED*** && activeSource && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">Import {activeSource.fileName}</h1>
              <span className="text-sm text-gray-600">{activeSource.parsed.data.length} records loaded</span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setStep(***REMOVED***upload***REMOVED***)}>Back to CSV sources</Button>
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
