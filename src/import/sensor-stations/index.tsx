import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import { Checkbox, Input, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import { forwardRef, useCallback, useEffect, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import { Check } from ***REMOVED***lucide-react***REMOVED***
import { useBatchImport } from ***REMOVED***../hooks/useBatchImport***REMOVED***

const TableComponentsOverride: TableComponents<{
  item: IDocument<unknown>
  selected: boolean
  imported: boolean
  loading: boolean
}> = {
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

const ImportableRow = ({
  index,
  item,
  imported,
  loading,
  selected,
  onChangeSelected,
}: {
  index: number
  item: IDocument<unknown>
  imported: boolean
  loading: boolean
  selected: boolean
  onChangeSelected: (selected: boolean, index: number) => void
}) => {
  return (
    <>
      <td className="px-6 py-4">
        {loading ? (
          <>
            <Loader size="sm" /> {item.label}
          </>
        ) : (
          <Checkbox
            id={`select-${item.uuid}`}
            testId={`select-${item.uuid}`}
            label={
              <>
                {item.label}
                {imported && <Check className="inline-block ml-2 text-green-500" size={16} />}
              </>
            }
            value={selected}
            onChange={(e) => {
              onChangeSelected(e, index)
            }}
          />
        )}
      </td>
      <td className="px-6 py-4">{item.slug}</td>
    </>
  )
}

const ImportSensorStations = ({ sensor_stations }: { sensor_stations: IDocument<unknown>[] }) => {
  const initialData = sensor_stations.map((station) => {
    return {
      item: station,
      selected: false,
      imported: false,
      loading: false,
    }
  })
  const [data, setData] = useState(initialData)
  const onChangeSelected = (selected: boolean, index: number) => {
    const newData = [...data]
    newData[index].selected = selected
    setData(newData)
  }

  const [startImport, setStartImport] = useState(false)
  const [batchSize, setBatchSize] = useState(10)

  const importOneRecord = useCallback(
    async (item: IDocument<unknown>, { signal }: { signal: AbortSignal }) => {
      console.log(item, signal)
      await new Promise((resolve) => setTimeout(resolve, 500))
    },
    []
  )

  const isSelected = useCallback((row: (typeof data)[number]) => row.selected, [])
  const isAlreadyImported = useCallback((row: (typeof data)[number]) => row.imported, [])
  const importBatchItem = useCallback(
    async (row: (typeof data)[number], { signal }: { signal: AbortSignal }) => {
      await importOneRecord(row.item, { signal })
    },
    [importOneRecord]
  )

  const handleBatchStart = useCallback((batch: typeof data) => {
    const ids = new Set(batch.map((r) => r.item.uuid))
    setData((prev) => prev.map((r) => (ids.has(r.item.uuid) ? { ...r, loading: true } : r)))
  }, [])

  const handleBatchComplete = useCallback(
    (batch: typeof data, results: PromiseSettledResult<void>[]) => {
      const byId = new Map(batch.map((r, i) => [r.item.uuid, results[i]]))
      setData((prev) =>
        prev.map((r) => {
          const result = byId.get(r.item.uuid)
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

  const handleDone = useCallback(() => {
    setStartImport(false)
  }, [])

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
        <Button
          disabled={startImport}
          onClick={() => {
            setStartImport(true)
          }}
          size="xs"
        >
          {startImport ? <Loader size="sm" /> : ***REMOVED***Import selected***REMOVED***}
        </Button>
      </div>
      <TableVirtuoso
        className="w-full bg-slate-100"
        data={data}
        components={TableComponentsOverride}
        fixedHeaderContent={() => (
          <tr>
            <th className="px-6 py-3">Label</th>
            <th className="px-6 w-[50%] py-3">Slug</th>
          </tr>
        )}
        itemContent={(index, sensor_station) => (
          <ImportableRow {...sensor_station} index={index} onChangeSelected={onChangeSelected} />
        )}
      />
    </>
  )
}

const LoadSensorStations = ({
  importUrl,
  onState,
}: {
  importUrl: string
  onState: (state: ***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***success***REMOVED*** | ***REMOVED***error***REMOVED***) => void
}) => {
  const {
    data: sensor_stations,
    isLoading,
    error,
  } = useQuery({
    queryKey: [***REMOVED***sensor_stations***REMOVED***, importUrl],
    queryFn: async ({ signal }) => {
      onState(***REMOVED***loading***REMOVED***)
      const response = await fetch(importUrl, {
        signal,
        headers: {
          ***REMOVED***content-type***REMOVED***: ***REMOVED***application/json***REMOVED***,
          accept: ***REMOVED***application/json***REMOVED***,
        },
      })
      if (!response.ok) {
        onState(***REMOVED***error***REMOVED***)
        throw new Error(***REMOVED***Network response was not ok***REMOVED***)
      }
      const data = await response.json()
      onState(***REMOVED***success***REMOVED***)
      return data.results.map((r) => ({
        uuid: r.uuid,
        label: r.label,
        slug: r.uuid,
        data: r.source,
      })) as IDocument<unknown>[]
    },
  })
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={sensor_stations}>
      {sensor_stations && <ImportSensorStations sensor_stations={sensor_stations} />}
    </ViewWithLoader>
  )
}

const ImportSensorStationsPage = (): ReactElement => {
  const [start, setStart] = useState(false)
  const [state, setState] = useState<***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***success***REMOVED*** | ***REMOVED***error***REMOVED***>(***REMOVED***idle***REMOVED***)
  const [importUrl, setImportUrl] = useState<string | undefined>(
    ***REMOVED***https://search.axds.co/v2/search?portalId=25&page=1&pageSize=100&type=sensor_station&verbose=true***REMOVED***
  )
  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-bold">Import Sensor Stations</h1>
      <div className="flex flex-row gap-4 items-center">
        <Input
          id="import-url"
          testId="import-url"
          className="w-180"
          size="sm"
          value={importUrl}
          onChange={(e) => setImportUrl(e)}
        />
        <Button
          disabled={!importUrl || state === ***REMOVED***loading***REMOVED***}
          onClick={() => {
            setStart(true)
          }}
        >
          Load sensor stations
        </Button>
      </div>
      <div className="relative flex-col h-full">
        {importUrl && start && <LoadSensorStations importUrl={importUrl} onState={setState} />}
      </div>
    </div>
  )
}

export default ImportSensorStationsPage
