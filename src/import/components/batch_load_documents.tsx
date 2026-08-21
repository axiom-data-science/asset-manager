import { Checkbox, Input, Loader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import { forwardRef, useCallback, useRef, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { Check } from ***REMOVED***lucide-react***REMOVED***
import { useBatchImport } from ***REMOVED***../hooks/useBatchImport***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***@/import/types***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***

const TableComponentsOverride: TableComponents<IDocumentImport> = {
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
  onChangeSelected: (selected: boolean, index: number) => void
}

const ImportRow = ({
  index,
  uuid,
  label,
  slug,
  imported,
  loading,
  selected,
  onChangeSelected,
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
  createDocument,
  includeRandomSelector = false,
}: {
  documents: IDocumentImport<unknown>[]
  getFullDoc: (props: {
    doc: IDocumentImport
    url?: string
    signal?: AbortSignal
    serviceRoot?: string
  }) => Promise<IFullDocForImport>
  detailRoot?: string
  RowView?: React.FC<IRowViewProps>
  onFullDocLoaded?: (fullDoc: IDocumentImport & IFullDocForImport) => Promise<void>
  onAllFullDocsLoaded?: (fullDocs: Array<IDocumentImport & IFullDocForImport>) => Promise<void>
  createDocument?: (
    fullDoc: IDocumentImport & IFullDocForImport
  ) => Promise<{ error?: string; document?: IDocument }>
  includeRandomSelector?: boolean
}): ReactElement => {
  const initialData = documents.map((doc) => {
    return {
      ...doc,
      selected: true,
      imported: false,
      loading: false,
    } as IDocument & {
      selected: boolean
      imported: boolean
      loading: boolean
      error?: string
      savedDocument?: IDocument
    }
  })
  const [data, setData] = useState(initialData)
  /* useEffect(() => {
        setData(initialData)
    }, [documents]) */

  const onChangeSelected = (selected: boolean, index: number) => {
    const newData = [...data]
    newData[index].selected = selected
    setData(newData)
  }

  const [startImport, setStartImport] = useState(false)
  const [batchSize, setBatchSize] = useState(10)
  const [randomSelectCount, setRandomSelectCount] = useState(20)
  const allDocsRef = useRef<Array<IDocumentImport & IFullDocForImport>>([])

  const importOneRecord = useCallback(
    async (item: IDocumentImport<unknown>, { signal }: { signal: AbortSignal }) => {
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
      const mergedFullDoc = {
        ...row,
        ...doc,
      }
      if (onFullDocLoaded) {
        await onFullDocLoaded(mergedFullDoc)
      }
      if (createDocument) {
        const { error, document } = await createDocument(mergedFullDoc)
        mergedFullDoc.error = error
        mergedFullDoc.savedDocument = document
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
      const byId = new Map(batch.map((r, i) => [r.uuid, results[i]]))
      setData((prev) =>
        prev.map((r) => {
          const result = byId.get(r.uuid)
          if (!result) return r
          if (result.status === ***REMOVED***fulfilled***REMOVED***) {
            return { ...r, imported: true, selected: false, loading: false }
          }
          return { ...r, loading: false }
        })
      )
    },
    []
  )

  const handleDone = useCallback(async () => {
    if (onAllFullDocsLoaded) {
      await onAllFullDocsLoaded(allDocsRef.current)
    }
    allDocsRef.current = []
    setStartImport(false)
  }, [onAllFullDocsLoaded])

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

  return (
    <>
      <div className="flex flex-row gap-4 items-center mb-4">
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
              {progress.done} of {progress.total}
            </span>
          </>
        )}
        {runError && <span className="text-red-500 text-xs">Error: {String(runError)}</span>}
      </div>
      <TableVirtuoso
        className="w-full bg-slate-100"
        data={data}
        components={TableComponentsOverride}
        fixedHeaderContent={() => (
          <tr>
            <th className="px-6 py-3">Label</th>
            <th className="px-6 w-[50%] py-3">Identifier</th>
          </tr>
        )}
        itemContent={(index, doc) => (
          <RowView {...doc} index={index} onChangeSelected={onChangeSelected} />
        )}
      />
    </>
  )
}

export default BatchLoadDocuments
