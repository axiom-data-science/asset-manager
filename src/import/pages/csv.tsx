import { useState, type ReactElement } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import type { IFieldInputProps } from '@axdspub/axiom-ui-forms'
import type { ParsedCSV } from '@/lib/csv'
import FileUpload from '@/manage/custom_inputs/file_upload'
import {
  createCSVImportAdapter,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
  inferCSVImportMapping,
} from '../csv_adapter'
import type { CSVImportMapping } from '../csv_adapter'
import type { ImportSourceAdapter } from '../types'
import ImportRecordsPage from './index'
import { Button } from '@/components/ui/button'
import { useImportSession } from '../state/importState'

const csvField = {
  id: 'csv-file',
  label: 'CSV file',
  description: 'Upload a CSV file to preview its rows before importing.',
} as IFieldInputProps['field']

const CSVImportPage = (): ReactElement => {
  const [fileReference, setFileReference] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [adapter, setAdapter] = useState<ImportSourceAdapter | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileText, setFileText] = useState<string | null>(null)
  const [mapping, setMapping] = useState<CSVImportMapping>({})
  const [step, setStep] = useState<'upload' | 'records'>('upload')
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const { setCandidates, setRecords, resetSession } = useImportSession(adapter?.id ?? 'csv-upload')

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
      setStep('records')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingRecords(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      {step === 'upload' && (
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
              acceptFileTypes={['csv', 'text/csv']}
              onFileUploaded={(fileData, csvData, uploadedFileName) => {
                if (typeof fileData !== 'string' || !csvData || !uploadedFileName) return
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
                    ['label', 'Label'],
                    ['slug', 'Slug'],
                    ['externalId', 'External ID'],
                    ['description', 'Description'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">{label}</span>
                    <select
                      value={mapping[field] ?? ''}
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
                            id: csvFileNameToTypeSlug(fileName ?? 'csv-import.csv'),
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
                              id: csvFileNameToTypeSlug(fileName ?? 'csv-import.csv'),
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
                {isLoadingRecords ? 'Loading records...' : 'Continue to records'}{' '}
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

      {step === 'records' && adapter && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b pb-2">
            <div>
              <h1 className="text-lg font-semibold">Import {fileName}</h1>
              <span className="text-sm text-gray-600">
                {parsed?.data.length ?? 0} records loaded
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={() => setStep('upload')}>
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
