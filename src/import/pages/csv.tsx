import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FileSpreadsheet } from ***REMOVED***lucide-react***REMOVED***
import type { IFieldInputProps } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import type { ParsedCSV } from ***REMOVED***@/lib/csv***REMOVED***
import FileUpload from ***REMOVED***@/manage/custom_inputs/file_upload***REMOVED***
import {
  createCSVImportAdapter,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  inferCSVImportMapping,
} from ***REMOVED***../csv_adapter***REMOVED***
import type { CSVImportMapping } from ***REMOVED***../csv_adapter***REMOVED***
import type { ImportSourceAdapter } from ***REMOVED***../types***REMOVED***
import ImportRecordsPage from ***REMOVED***./index***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { useImportSession } from ***REMOVED***../state/importState***REMOVED***

const csvField = {
  id: ***REMOVED***csv-file***REMOVED***,
  label: ***REMOVED***CSV file***REMOVED***,
  description: ***REMOVED***Upload a CSV file to preview its rows before importing.***REMOVED***,
} as IFieldInputProps[***REMOVED***field***REMOVED***]

const CSVImportPage = (): ReactElement => {
  const [fileReference, setFileReference] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [adapter, setAdapter] = useState<ImportSourceAdapter | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileText, setFileText] = useState<string | null>(null)
  const [mapping, setMapping] = useState<CSVImportMapping>({})
  const [step, setStep] = useState<***REMOVED***upload***REMOVED*** | ***REMOVED***records***REMOVED***>(***REMOVED***upload***REMOVED***)
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const { setCandidates, setRecords, resetSession } = useImportSession(adapter?.id ?? ***REMOVED***csv-upload***REMOVED***)

  const continueToRecords = async () => {
    if (!adapter) return
    setIsLoadingRecords(true)
    setLoadError(undefined)
    try {
      resetSession()
      const candidates = await adapter.discover({
        url: adapter.defaultImportUrl,
        signal: new AbortController().signal,
      })
      setCandidates(candidates)
      const records = await Promise.all(candidates.map((candidate) => adapter.load({ candidate })))
      setRecords(records)
      setStep(***REMOVED***records***REMOVED***)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      {step === ***REMOVED***upload***REMOVED*** && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <section className="border-b pb-4">
            <h1 className="text-2xl font-bold">Import CSV</h1>
            <FileUpload
              field={csvField}
              value={fileReference}
              onChange={(value) => {
                const reference = value === null ? null : String(value)
                setFileReference(reference)
                if (reference === null) {
                  setParsed(null)
                  setAdapter(null)
                  setFileName(null)
                  setFileText(null)
                  setMapping({})
                }
              }}
              acceptFileTypes={[***REMOVED***csv***REMOVED***, ***REMOVED***text/csv***REMOVED***]}
              onFileUploaded={(fileData, csvData, uploadedFileName) => {
                if (typeof fileData !== ***REMOVED***string***REMOVED*** || !csvData || !uploadedFileName) return
                const typeSlug = csvFileNameToTypeSlug(uploadedFileName)
                setParsed(csvData)
                setFileName(uploadedFileName)
                setFileText(fileData)
                setMapping(inferCSVImportMapping(csvData.headers.map((header) => header.key)))
                setAdapter(
                  createCSVImportAdapter({
                    id: typeSlug,
                    label: csvFileNameToTypeLabel(uploadedFileName),
                    text: fileData,
                    mapping: inferCSVImportMapping(csvData.headers.map((header) => header.key)),
                  })
                )
              }}
            />
          </section>

          {parsed && (
            <section className="min-h-0 border-b pb-4" aria-label="CSV preview">
              <div className="mb-3 flex flex-wrap items-baseline gap-3">
                <h2 className="font-semibold">Preview</h2>
                <span className="text-sm text-gray-600">
                  {parsed.data.length} rows, {parsed.headers.length} columns
                </span>
              </div>
              <div className="max-h-64 overflow-auto border">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {parsed.headers.map((header) => (
                        <th key={header.key} className="border-b px-3 py-2 font-medium">
                          <div>{header.key}</div>
                          <div className="text-xs font-normal text-gray-500">{header.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.data.slice(0, 25).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-b-0">
                        {parsed.headers.map((header) => (
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
          )}

          {parsed && fileText && (
            <section className="border-b pb-4" aria-label="CSV field mapping">
              <div className="mb-3">
                <h2 className="font-semibold">Map CSV fields</h2>
                <p className="text-sm text-gray-600">
                  Confirm which columns become document fields. Unmapped columns remain in document
                  data when selected below.
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
                      value={mapping[field] ?? ***REMOVED******REMOVED***}
                      onChange={(event) => {
                        const nextValue = event.target.value || undefined
                        const specialColumns = new Set(
                          [
                            mapping.label,
                            mapping.slug,
                            mapping.externalId,
                            mapping.description,
                            nextValue,
                          ].filter((column): column is string => Boolean(column))
                        )
                        const nextMapping = {
                          ...mapping,
                          [field]: nextValue,
                          dataColumns: (mapping.dataColumns ?? []).filter(
                            (column) => !specialColumns.has(column)
                          ),
                        }
                        setMapping(nextMapping)
                        setAdapter(
                          createCSVImportAdapter({
                            id: csvFileNameToTypeSlug(fileName ?? ***REMOVED***csv-import.csv***REMOVED***),
                            text: fileText,
                            mapping: nextMapping,
                          })
                        )
                      }}
                      className="border px-2 py-1"
                    >
                      <option value="">Not mapped</option>
                      {parsed.headers.map((header) => (
                        <option key={header.key} value={header.key}>
                          {header.key}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {parsed.headers.map((header) => {
                  const selected = mapping.dataColumns?.includes(header.key) ?? false
                  return (
                    <label key={header.key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          const dataColumns = new Set(mapping.dataColumns ?? [])
                          if (event.target.checked) dataColumns.add(header.key)
                          else dataColumns.delete(header.key)
                          const nextMapping = { ...mapping, dataColumns: Array.from(dataColumns) }
                          setMapping(nextMapping)
                          setAdapter(
                            createCSVImportAdapter({
                              id: csvFileNameToTypeSlug(fileName ?? ***REMOVED***csv-import.csv***REMOVED***),
                              text: fileText,
                              mapping: nextMapping,
                            })
                          )
                        }}
                      />
                      {header.key}
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          {adapter && (
            <div className="flex justify-end border-t pt-4">
              <Button disabled={isLoadingRecords} onClick={() => void continueToRecords()}>
                {isLoadingRecords ? ***REMOVED***Loading records...***REMOVED*** : ***REMOVED***Continue to records***REMOVED***}{***REMOVED*** ***REMOVED***}
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

      {step === ***REMOVED***records***REMOVED*** && adapter && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">Import {fileName}</h1>
              <span className="text-sm text-gray-600">
                {parsed?.data.length ?? 0} records loaded
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setStep(***REMOVED***upload***REMOVED***)}>
              Choose a different file
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ImportRecordsPage
              key={`${adapter.id}-${parsed?.data.length ?? 0}`}
              type={adapter.id}
              label={fileName ? csvFileNameToTypeLabel(fileName) : adapter.id}
              pluralLabel="CSV records"
              sourceAdapter={adapter}
              csvSource
              icon={FileSpreadsheet}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVImportPage
