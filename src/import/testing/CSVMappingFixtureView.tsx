import { useEffect, useState } from 'react'
import type { CanonicalImportRecord } from '../types'
import type { ParsedWorkbookSheet } from '../workbook'
import { convertWorkbookSheets, parseWorkbookFile } from '../workbook'
import { selectWorkbookSheets } from '../workbook_selection'
import {
  createCSVMappingFixture,
  csvMappingFixtureText,
  csvMappingFixtureWorksheetData,
} from './csvMappingFixture'
import { CSVSourceEditor } from '../pages/csv'
import type { CSVImportSource } from '../pages/csv'

export const CSVMappingFixtureView = () => {
  const [source, setSource] = useState(() => createCSVMappingFixture().source)
  const [workbookSheets, setWorkbookSheets] = useState<ParsedWorkbookSheet[]>([])
  const [selectedWorkbookSheets, setSelectedWorkbookSheets] = useState<Set<string>>(new Set())
  const [workbookSources, setWorkbookSources] = useState<CSVImportSource[]>([])
  const [activeWorkbookSourceId, setActiveWorkbookSourceId] = useState<string>()
  const [records, setRecords] = useState<CanonicalImportRecord[]>([])
  const [error, setError] = useState<string>()
  const [activeFormat, setActiveFormat] = useState<'csv' | 'worksheet' | 'xlsx'>('csv')
  const activeWorkbookSource = workbookSources.find(
    (workbookSource) => workbookSource.sourceId === activeWorkbookSourceId
  )
  const activeSource = activeFormat === 'xlsx' ? activeWorkbookSource : source

  useEffect(() => {
    const controller = new AbortController()
    const loadRecords = async () => {
      if (!activeSource) {
        setRecords([])
        setError(undefined)
        return
      }
      try {
        const candidates = await activeSource.adapter.discover({
          url: activeSource.adapter.defaultImportUrl,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const loaded = await Promise.all(
          candidates.map((candidate) => activeSource.adapter.load({ candidate, signal: controller.signal }))
        )
        if (!controller.signal.aborted) {
          setRecords(loaded)
          setError(undefined)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRecords([])
          setError(error instanceof Error ? error.message : String(error))
        }
      }
    }
    void loadRecords()
    return () => controller.abort()
  }, [activeSource])

  const selectFormat = (format: 'csv' | 'worksheet') => {
    const text = format === 'csv'
      ? csvMappingFixtureText
      : convertWorkbookSheets([
          { sheet: 'Sites', data: csvMappingFixtureWorksheetData },
        ])[0].text
    const nextSource = createCSVMappingFixture(text).source
    setActiveFormat(format)
    setSource(nextSource)
    setRecords([])
  }

  const uploadWorkbook = async (file?: File) => {
    if (!file) return
    setActiveFormat('xlsx')
    setWorkbookSources([])
    setActiveWorkbookSourceId(undefined)
    setWorkbookSheets([])
    setError(undefined)
    try {
      const sheets = await parseWorkbookFile(file)
      setWorkbookSheets(sheets)
      setSelectedWorkbookSheets(new Set(sheets.map(({ name }) => name)))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError))
    }
  }

  const addSelectedWorkbookSheets = () => {
    const selectedSheets = selectWorkbookSheets(workbookSheets, selectedWorkbookSheets)
    const nextSources = selectedSheets.map(({ name, text }) =>
      createCSVMappingFixture(text, {
        sourceId: `fixture-workbook-${name.toLowerCase()}`,
        fileName: `${name}.csv`,
        label: name,
      }).source
    )
    setWorkbookSources(nextSources)
    setActiveWorkbookSourceId(nextSources[0]?.sourceId)
  }

  const updateActiveSource = (update: Partial<CSVImportSource>) => {
    if (activeFormat === 'xlsx' && activeWorkbookSource) {
      setWorkbookSources((current) => current.map((workbookSource) =>
        workbookSource.sourceId === activeWorkbookSource.sourceId
          ? { ...workbookSource, ...update }
          : workbookSource
      ))
      return
    }
    setSource((current) => ({ ...current, ...update }))
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold">CSV mapping fixture</h1>
        <nav aria-label="Source format" className="flex gap-2">
          <button
            type="button"
            aria-pressed={activeFormat === 'csv'}
            onClick={() => selectFormat('csv')}
            className="border px-3 py-1.5"
          >
            CSV
          </button>
          <button
            type="button"
            aria-pressed={activeFormat === 'worksheet'}
            onClick={() => selectFormat('worksheet')}
            className="border px-3 py-1.5"
          >
            Worksheet
          </button>
        </nav>
      </header>

      <section aria-label="XLSX fixture upload" className="flex flex-col gap-3">
        <label className="flex flex-wrap items-center gap-3 text-sm">
          Upload XLSX workbook
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Upload XLSX workbook"
            onChange={(event) => {
              void uploadWorkbook(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
        {error && activeFormat === 'xlsx' && <p role="alert">{error}</p>}
        {activeFormat === 'xlsx' && workbookSheets.length > 0 && workbookSources.length === 0 && (
          <div aria-label="Workbook worksheet selection" className="flex flex-col gap-2">
            {workbookSheets.map((sheet) => (
              <label key={sheet.name} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Include ${sheet.name} worksheet`}
                  checked={selectedWorkbookSheets.has(sheet.name)}
                  onChange={(event) => setSelectedWorkbookSheets((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(sheet.name)
                    else next.delete(sheet.name)
                    return next
                  })}
                />
                {sheet.name}
              </label>
            ))}
            <button
              type="button"
              disabled={selectedWorkbookSheets.size === 0}
              onClick={addSelectedWorkbookSheets}
            >
              Add {selectedWorkbookSheets.size} selected sheets
            </button>
          </div>
        )}
        {activeFormat === 'xlsx' && workbookSources.length > 0 && (
          <nav aria-label="Workbook sheet mappings" className="flex gap-2">
            {workbookSources.map((workbookSource) => (
              <button
                key={workbookSource.sourceId}
                type="button"
                aria-pressed={workbookSource.sourceId === activeWorkbookSourceId}
                onClick={() => setActiveWorkbookSourceId(workbookSource.sourceId)}
              >
                Map {workbookSource.fileName.replace(/\.csv$/i, '')}
              </button>
            ))}
          </nav>
        )}
      </section>

      {activeSource && (
        <CSVSourceEditor
          source={activeSource}
          sources={activeFormat === 'xlsx' ? workbookSources : [source]}
          onChange={updateActiveSource}
          mode="mapping"
          viewConfig={createCSVMappingFixture().viewConfig}
        />
      )}

      {activeSource && <section aria-label="Mapped record preview" className="border-t pt-4">
        <h2 className="mb-2 font-semibold">Mapped records</h2>
        {error && <p role="alert" className="mb-2 text-red-700">{error}</p>}
        <output aria-label="Active worksheet" className="sr-only">{activeSource.fileName}</output>
        <pre data-testid="mapped-records" className="overflow-auto text-sm">
          {JSON.stringify(records, null, 2)}
        </pre>
        <output aria-label="Start at import" className="sr-only">
          {String(activeSource.startAtImport)}
        </output>
        <output aria-label="Relationship rules" className="sr-only">
          {JSON.stringify(activeSource.adapter.relationshipRules ?? [])}
        </output>
      </section>}
    </main>
  )
}