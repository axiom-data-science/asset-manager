import { Checkbox, Input, Loader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import { forwardRef, useCallback, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { Check, TriangleAlert } from ***REMOVED***lucide-react***REMOVED***
import { useBatchImport, type BatchProgress } from ***REMOVED***../hooks/useBatchImport***REMOVED***
import type { CanonicalImportRecord, ImportCandidate } from ***REMOVED***@/import/types***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import {
  applyBatchResults,
  createImportRows,
  importCandidateListKey,
  type ImportRowState,
} from ***REMOVED***./batch_import_state***REMOVED***
import type { ImportErrorKind } from ***REMOVED***@/import/import_errors***REMOVED***

const TableComponentsOverride: TableComponents<ImportCandidate> = {
  Table: (props) => (
    <table
      {...props}
      className="w-full border-collapse text-left text-sm text-gray-600 dark:text-gray-300"
    />
  ),
  TableHead: forwardRef((props, ref) => (
    <thead
      {...props}
      ref={ref}
      className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm"
    />
  )),
  TableRow: (props) => (
    <tr
      {...props}
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700 transition-colors"
    />
  ),
  TableBody: forwardRef((props, ref) => <tbody {...props} ref={ref} />),
}

type IRowViewProps = {
  index: number
  uuid: string
  label: string
  slug: string
  data: unknown
  imported?: boolean
  loading?: boolean
  selected?: boolean
  error?: string
  errorKind?: ImportErrorKind
  onChangeSelected: (selected: boolean, index: number) => void
  onIgnoreError: (index: number) => void
  onResolveConflict?: () => void
}

const ImportRow = ({
  index,
  uuid,
  label,
  slug,
  imported,
  loading,
  selected,
  error,
  errorKind,
  onChangeSelected,
  onIgnoreError,
  onResolveConflict,
}: IRowViewProps): ReactElement => {
  return (
    <>
      <td className="px-6 py-4">
        <Checkbox
          id={`select-${uuid}`}
          testId={`select-${uuid}`}
          disabled={loading}
          label={
            <>
              {label}
              {imported && !loading && (
                <Check className="inline-block ml-2 text-green-500" size={16} />
              )}
              {loading && <Loader className="w-10 inline-block -mb-1 ml-2" size="xs" />}
            </>
          }
          value={!!selected}
          onChange={(e) => {
            onChangeSelected(e, index)
          }}
        />
        {error && (
          <div className="flex flex-wrap items-center gap-2 mt-2 text-red-700 text-xs" role="alert">
            <span className="inline-flex items-center gap-1">
              <TriangleAlert size={14} /> {error}
            </span>
            {errorKind === ***REMOVED***duplicate-type-slug***REMOVED*** && (
              <>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onIgnoreError(index)}
                >
                  Ignore record
                </Button>
                {onResolveConflict && (
                  <Button type="button" size="xs" variant="outline" onClick={onResolveConflict}>
                    Return to duplicate check
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4">{slug}</td>
    </>
  )
}

const BatchLoadDocuments = ({
  documents,
  getFullDoc,
  detailRoot,
  RowView = ImportRow,
  onFullDocLoaded,
  onAllFullDocsLoaded,
  onRecordResult,
  onIgnoreConflict,
  onResolveConflict,
  createDocument,
  includeRandomSelector = false,
}: {
  documents: ImportCandidate<unknown>[]
  getFullDoc: (props: {
    doc: ImportCandidate
    url?: string
    signal?: AbortSignal
    serviceRoot?: string
  }) => Promise<CanonicalImportRecord>
  detailRoot?: string
  RowView?: React.FC<IRowViewProps>
  onFullDocLoaded?: (
    fullDoc: CanonicalImportRecord,
    context: { signal: AbortSignal }
  ) => Promise<void>
  onAllFullDocsLoaded?: (fullDocs: CanonicalImportRecord[], summary: BatchProgress) => Promise<void>
  onRecordResult?: (record: ImportCandidate, result: PromiseSettledResult<void>) => void
  onIgnoreConflict?: (record: ImportCandidate) => void
  onResolveConflict?: () => void
  createDocument?: (
    fullDoc: CanonicalImportRecord
  ) => Promise<{ error?: string; document?: IDocument }>
  includeRandomSelector?: boolean
}): ReactElement => {
  const [data, setData] = useState<ImportRowState[]>(() => createImportRows(documents))
  const documentListKey = importCandidateListKey(documents)
  const [previousDocumentListKey, setPreviousDocumentListKey] = useState(documentListKey)
  if (previousDocumentListKey !== documentListKey) {
    setPreviousDocumentListKey(documentListKey)
    setData(createImportRows(documents))
  }

  const onChangeSelected = (selected: boolean, index: number) => {
    const newData = [...data]
    newData[index].selected = selected
    setData(newData)
  }

  const onIgnoreError = (index: number) => {
    const record = data[index]
    if (record) onIgnoreConflict?.(record)
    setData((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, selected: false, error: undefined, errorKind: undefined }
          : row
      )
    )
  }

  const [startImport, setStartImport] = useState(false)
  const [batchSize, setBatchSize] = useState(10)
  const [randomSelectCount, setRandomSelectCount] = useState(20)
  const allDocsRef = useRef<CanonicalImportRecord[]>([])

  const importOneRecord = useCallback(
    async (item: ImportCandidate<unknown>, { signal }: { signal: AbortSignal }) => {
      //console.log(item, signal)

      const fullDoc = await getFullDoc({ doc: item, signal, serviceRoot: detailRoot })
      await new Promise((resolve) => setTimeout(resolve, 50))
      return fullDoc
    },
    [detailRoot, getFullDoc]
  )

  const isSelected = useCallback((row: (typeof data)[number]) => row.selected, [])
  const isAlreadyImported = useCallback((/* row: (typeof data)[number] */) => false, []) // allow re-import
  const importBatchItem = useCallback(
    async (row: (typeof data)[number], { signal }: { signal: AbortSignal }) => {
      const doc = await importOneRecord(row, { signal })
      const mergedFullDoc: CanonicalImportRecord = {
        ...row,
        ...doc,
      }
      if (onFullDocLoaded) {
        await onFullDocLoaded(mergedFullDoc, { signal })
      }
      if (createDocument) {
        const { error, document } = await createDocument(mergedFullDoc)
        if (error) throw new Error(error)
        if (document) {
          setData((previous) =>
            previous.map((candidate) =>
              candidate.uuid === row.uuid ? { ...candidate, savedDocument: document } : candidate
            )
          )
        }
      }
      allDocsRef.current.push(mergedFullDoc)
    },
    [createDocument, importOneRecord, onFullDocLoaded]
  )

  const handleBatchStart = useCallback((batch: typeof data) => {
    const ids = new Set(batch.map((r) => r.uuid))
    setData((prev) => prev.map((r) => (ids.has(r.uuid) ? { ...r, loading: true } : r)))
  }, [])

  const handleBatchComplete = useCallback(
    (batch: typeof data, results: PromiseSettledResult<void>[]) => {
      setData((previous) => applyBatchResults(previous, batch, results))
      batch.forEach((record, index) => {
        const result = results[index]
        if (result) onRecordResult?.(record, result)
      })
    },
    [onRecordResult]
  )

  const handleDone = useCallback(
    async (summary: BatchProgress) => {
      if (onAllFullDocsLoaded) {
        await onAllFullDocsLoaded(allDocsRef.current, summary)
      }
      allDocsRef.current = []
      setStartImport(false)
    },
    [onAllFullDocsLoaded]
  )

  const { isRunning, progress, runError, cancel } = useBatchImport({
    enabled: startImport,
    items: data,
    batchSize,
    isSelected,
    isAlreadyImported,
    importItem: importBatchItem,
    onBatchStart: handleBatchStart,
    onBatchComplete: handleBatchComplete,
    onDone: handleDone,
  })
  const failedRows = data.filter((row) => row.error)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-row gap-4 items-center mb-4">
        <Checkbox
          id="select-all"
          testId="select-all"
          label="Select All"
          value={!data.find((d) => !d.selected)}
          onChange={(e) => {
            const newData = data.map((d) => ({ ...d, selected: e }))
            setData(newData)
          }}
        />
        <div className="flex flex-row gap-2 items-center text-xs">
          <span>Batch Size:</span>
          <Input
            id="batch-size"
            testId="batch-size"
            className="w-10 text-center"
            size="xs"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e))}
          />
        </div>
        <Button
          disabled={isRunning}
          onClick={() => {
            setStartImport(true)
          }}
          size="xs"
        >
          {isRunning ? <Loader size="sm" /> : ***REMOVED***Import selected***REMOVED***}
        </Button>
        {!isRunning && includeRandomSelector && (
          <span className="flex flex-row justify-end gap-2 text-xs items-center grow">
            Randomly select
            <Input
              id="random-select-percentage"
              testId="random-select-percentage"
              className="w-10 text-center"
              size="xs"
              value={randomSelectCount}
              onChange={(e) => setRandomSelectCount(Number(e))}
            />
            <Button
              disabled={isRunning}
              onClick={() => {
                const newSelected = data
                  .slice()
                  .sort(() => 0.5 - Math.random())
                  .slice(0, randomSelectCount)
                const newData = data.map((d) => {
                  return {
                    ...d,
                    selected: newSelected.includes(d),
                  }
                })
                setData(newData)
              }}
              size="xs"
            >
              Go
            </Button>
          </span>
        )}
        {isRunning && (
          <>
            <Button
              onClick={() => {
                cancel()
                setStartImport(false)
              }}
              size="xs"
              variant="destructive"
            >
              Cancel
            </Button>
            <span className="text-xs">
              {progress.done} succeeded, {progress.failed} failed of {progress.total}
            </span>
          </>
        )}
        {!isRunning && progress.total > 0 && (
          <span className={progress.failed > 0 ? ***REMOVED***text-red-600 text-xs***REMOVED*** : ***REMOVED***text-green-700 text-xs***REMOVED***}>
            {progress.done} succeeded, {progress.failed} failed of {progress.total}
          </span>
        )}
        {runError && <span className="text-red-500 text-xs">Error: {String(runError)}</span>}
      </div>
      {failedRows.length > 0 && (
        <div className="mb-3 border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <strong>{failedRows.length} records could not be saved.</strong>
          <span className="ml-2">Review the errors below and choose an available action.</span>
        </div>
      )}
      <TableVirtuoso
        className="min-h-80 w-full flex-1 bg-slate-100"
        style={{ minHeight: 320 }}
        data={data}
        components={TableComponentsOverride}
        fixedHeaderContent={() => (
          <tr>
            <th className="px-6 py-3">Label</th>
            <th className="px-6 w-[50%] py-3">Identifier</th>
          </tr>
        )}
        itemContent={(index, doc) => (
          <RowView
            {...doc}
            index={index}
            onChangeSelected={onChangeSelected}
            onIgnoreError={onIgnoreError}
            onResolveConflict={onResolveConflict}
          />
        )}
      />
    </div>
  )
}

export default BatchLoadDocuments
