import type { ReactElement } from 'react'
import importConfigs from '../config'
import { Button, Checkbox, Input, Loader, SelectInput } from '@axdspub/axiom-ui-utilities'
import { useEffect, useState } from 'react'
import type { IImportPageProps } from './import_records_page_impl'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'

type IImportStatus = '' | 'pending' | 'in_progress' | 'complete'

const ImportResults = (): ReactElement => {
  const list = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Document ${i + 1}`,
    status: 'Pending',
  }))
  return (
    <>
      {list.map((item) => (
        <div
          key={item.id}
          className="text-xs text-slate-400 flex flex-row gap-4 p-2 even:bg-gray-100 odd:bg-gray-50"
        >
          <span>{item.name}</span>
          <span>{item.status}</span>
        </div>
      ))}
    </>
  )
}

const ImportItem = ({
  type,
  status,
  onItemComplete,
  onImportComplete,
  importAll,
  importCount,
  ...config
}: IImportPageProps & {
  status: IImportStatus
  type: string
  onItemComplete: (key: string, status: IImportStatus) => void
  onImportComplete: () => void
  importAll: boolean
  importCount: number
}): ReactElement => {
  const [context] = useAtom(contextStateAtom)
  const [selected, setSelected] = useState(true)
  const [includeEnums, setIncludeEnums] = useState(false)
  const [overrideImport, setOverrideImport] = useState<string | undefined>(undefined)
  const [overrideRoot, setOverrideRoot] = useState<string | undefined>(undefined)
  const [batchSize, setBatchSize] = useState<number | undefined>(20)

  const existingObjectType = context.object_type_by_slug[type]
  const [objectType, setObjectType] = useState(existingObjectType)
  const [createObjectTypeFromData, setCreateObjectTypeFromData] = useState(!existingObjectType)
  const [loadAllRecords, setLoadAllRecords] = useState(importAll)
  const [totalToImport, setTotalToImport] = useState<number | undefined>(importCount)

  useEffect(() => {
    setLoadAllRecords(importAll)
    setTotalToImport(importCount)
  }, [importAll, importCount])

  if (status === 'in_progress') {
    // Simulate import process
    setTimeout(() => {
      onItemComplete(type, 'complete')
      onImportComplete()
    }, 1000)
  }

  return (
    <div className={`relative overflow-hidden${selected ? ' h-85' : ''}`}>
      <div className="flex flex-row gap-10 h-full min-h-0">
        <div className="flex flex-col gap-4 p-4 even:bg-gray-100">
          <span className="text-xs">{status}</span>
          <span>
            <Checkbox
              id={`import-${type}`}
              size="xl"
              testId={`import-${type}`}
              label={config.label}
              value={selected}
              onChange={(e) => {
                setSelected(e)
              }}
            />
          </span>
          {selected && (
            <>
              <span>
                <Checkbox
                  id={`import-${type}-enums`}
                  testId={`import-${type}-enums`}
                  label="Include Enums"
                  value={includeEnums}
                  onChange={(e) => {
                    setIncludeEnums(e)
                  }}
                />
              </span>
              <div className="flex flex-row gap-4">
                <span>
                  <Input
                    id={`import-${type}-override-endpoint`}
                    testId={`import-${type}-override-endpoint`}
                    label="Override Endpoint"
                    placeholder={'Override endpoint'}
                    value={overrideImport}
                    size="xs"
                    onChange={(e) => {
                      if (e !== undefined && e.trim() !== '') {
                        setOverrideImport(e)
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">
                    Override the default endpoint for this import.
                  </span>
                </span>
                <span>
                  <Input
                    id={`import-${type}-override-root`}
                    testId={`import-${type}-override-root`}
                    label="Override Root"
                    placeholder={'Override root'}
                    value={overrideRoot}
                    size="xs"
                    disabled={overrideRoot === 'UNUSED'}
                    onChange={(e) => {
                      if (e !== undefined && e.trim() !== '') {
                        setOverrideRoot(e)
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">
                    Override the default root for this import.
                  </span>
                </span>
              </div>
              <div className="flex flex-row gap-10 py-2">
                <span className="max-w-80 flex flex-col gap-1">
                  <Checkbox
                    id={`import-${type}-load-all-records`}
                    testId={`import-${type}-load-all-records`}
                    label="Load All Records"
                    value={loadAllRecords}
                    onChange={(e) => {
                      setLoadAllRecords(e)
                    }}
                  />
                  <span className="flex flex-row gap-2 items-center">
                    <Input
                      id={`import-${type}-batch-size`}
                      testId={`import-${type}-batch-size`}
                      label="Batch Size"
                      placeholder="100"
                      value={batchSize?.toString() ?? '100'}
                      size="xs"
                      onChange={(e) => {
                        if (e !== undefined && e.trim() !== '') {
                          const batchSize = parseInt(e)
                          if (!isNaN(batchSize)) {
                            setBatchSize(batchSize)
                          }
                        }
                      }}
                    />


                    <Input
                      id={`import-${type}-total-to-import`}
                      testId={`import-${type}-total-to-import`}
                      label="Total to Import"
                      disabled={loadAllRecords}
                      placeholder="50"
                      value={totalToImport?.toString() ?? '50'}
                      size="xs"
                      onChange={(e) => {
                        if (e !== undefined && e.trim() !== '') {
                          const totalToImport = parseInt(e)
                          if (!isNaN(totalToImport)) {
                            setTotalToImport(totalToImport)
                          }
                        }
                      }}
                    />

                  </span>
                </span>
                <span className="flex flex-col gap-1 max-w-60">
                  <Checkbox
                    id={`import-${type}-override-batch-size`}
                    testId={`import-${type}-override-batch-size`}
                    label="Create object type from data"
                    value={createObjectTypeFromData}
                    onChange={(e) => {
                      setCreateObjectTypeFromData(e)
                    }}
                  />

                  {!createObjectTypeFromData && (
                    <SelectInput
                      id={`import-${type}-object-type`}
                      testId={`import-${type}-object-type`}
                      label="Object Type"
                      value={objectType?.slug ?? ''}
                      size='sm'
                      onChange={(e) => {
                        const selectedObjectType =
                          context.object_type_by_slug[e?.value ? String(e.value) : '']
                        setObjectType(selectedObjectType)
                      }}
                      options={Object.values(context.object_type_by_slug).map((ot) => ({
                        label: ot.label,
                        value: ot.slug,
                      }))}
                    />
                  )}
                </span>
              </div>
            </>
          )}
        </div>
        {selected && (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 relative bg-slate-200 overflow-hidden">
            <h3 className="text-sm font-semibold py-1 px-2 absolute left-0 top-0 right-0 bg-slate-300">
              Results
            </h3>
            <div className="flex flex-col gap-0 flex-1 min-h-0 overflow-y-auto mt-7">
              <ImportResults />
            </div>
          </div>
        )}
      </div>
      {status === 'pending' ||
        (status === 'in_progress' && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/50 p-2">
            <Loader />
          </div>
        ))}
    </div>
  )
}

const ImportAllPage = (): ReactElement => {
  const configs = importConfigs.slice()
  const updateAllToStatus = (
    status: IImportStatus = ''
  ): Record<string, { status: IImportStatus }> => {
    return Object.fromEntries(Object.keys(configs).map((key) => [key, { status }]))
  }
  const [, setDoImport] = useState(false)
  const [importStatus, setImportStatus] =
    useState<Record<string, { status: IImportStatus }>>(updateAllToStatus())


  const getNextImportItem = (): string | undefined => {
    const pendingItems = Object.entries(importStatus).filter(
      ([, value]) => value.status === 'pending' || value.status === ''
    )
    if (pendingItems.length > 0) {
      return pendingItems[0][0]
    }
    return undefined
  }

  const startImport = () => {
    setDoImport(true)
    setImportStatus(updateAllToStatus('pending'))
    const nextItem = getNextImportItem()
    if (nextItem) {
      setImportStatus((prev) => ({
        ...prev,
        [nextItem]: { status: 'in_progress' },
      }))
    }
  }

  const onImportComplete = (itemKey: string) => {
    setImportStatus((prev) => ({
      ...prev,
      [itemKey]: { status: 'complete' },
    }))

    const nextItem = getNextImportItem()
    if (nextItem) {
      setImportStatus((prev) => ({
        ...prev,
        [nextItem]: { status: 'in_progress' },
      }))
    } else {
      // All items are complete
      console.log('All imports complete')
      setImportStatus(updateAllToStatus(''))
    }
  }

  const [importAll, setImportAll] = useState(false)
  const [importCount, setImportCount] = useState(100)

  return (
    <>
      <div className="flex flex-col gap-2  p-4 bg-white sticky top-0 border-b z-10">
        <div className='flex flex-row gap-4 items-center'>
          <span className="text-lg font-semibold">Import All</span>
          <Button
            onClick={() => {
              startImport()
            }}
            variant="default"
          >
            Start Import
          </Button>
          <span className='flex flex-row grow text-xs justify-end gap-4 items-center'>
            <Checkbox
              id={`import-all`}
              testId={`import-all`}
              label="Import All"
              value={importAll}
              onChange={(e) => {
                setImportAll(e)
              }}
            />


            <Input
              id={`import-count`}
              testId={`import-count`}
              placeholder="100"
              value={importCount?.toString() ?? '100'}
              size="xs"
              disabled={importAll}
              onChange={(e) => {
                if (e !== undefined && e.trim() !== '') {
                  const count = parseInt(e)
                  if (!isNaN(count)) {
                    setImportCount(count)
                  }
                }
              }}
            />

          </span>

        </div>


      </div>
      <div className="flex flex-col gap-4">
        {configs.map(config => (
          <div key={config.type} className="flex flex-col gap-2 p-4 even:bg-gray-100 odd:bg-gray-50">
            <ImportItem
              {...config}
              type={config.type}
              status={importStatus[config.type]?.status ?? 'pending'}
              importAll={importAll}
              importCount={importCount}
              onItemComplete={(itemKey, status) => {
                console.log(`Item ${itemKey} completed with status: ${status}`)
              }}
              onImportComplete={() => {
                onImportComplete(config.type)
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}

export default ImportAllPage
