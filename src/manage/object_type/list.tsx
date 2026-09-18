import { dateTime } from ***REMOVED***@/lib/date***REMOVED***
import {
  objectTypeListQueryKey,
  useObjectTypeListWithRollups,
} from ***REMOVED***@/manage/object_type/useObjectTypeList***REMOVED***
import { Button, SelectInput, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import type { IObjectType, IPostgrestParams, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { deleteObjectType } from ***REMOVED***./services***REMOVED***
import { useAuth } from ***REMOVED***react-oidc-context***REMOVED***
import useCacheInvalidator from ***REMOVED***@/manage/components/useCacheInvalidator***REMOVED***
import { TriangleAlert, X } from ***REMOVED***lucide-react***REMOVED***

const DeleteButton = ({
  object_type,
  document_count,
  onDelete,
}: {
  object_type: IObjectType
  document_count: number
  onDelete: () => void
}): ReactElement => {
  const [confirm, setConfirm] = useState(false)
  const auth = useAuth()
  const handleClick = (): void => {
    if (!confirm) {
      setConfirm(true)
    } else {
      setConfirm(false)
      handleDelete()
    }
  }
  const handleDelete = (): void => {
    deleteObjectType({
      uuid: object_type.uuid,
      token: auth?.user?.access_token ?? ***REMOVED******REMOVED***,
    }).then(() => {
      onDelete()
    })
  }
  return (
    <span className=***REMOVED***flex flex-col gap-2***REMOVED***>
      {
        confirm && document_count > 0 && (
          <span className="text-xs text-red-600 flex flex-row items-start gap-2">
            <TriangleAlert className=***REMOVED***w-4 h-4***REMOVED*** /> This will also delete {document_count} documents
          </span>
        )
      }
      <span className="flex flex-row items-center gap-4">
        <Button onClick={handleClick} size="xs" type="alert" className="text-white">
          {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
        </Button>
        {
          confirm && (
            <X onClick={() => setConfirm(false)} size="xs" type="secondary" className="w-4 h-4 cursor-pointer" />
          )
        }
      </span>
    </span>
  )
}

const ListObjectTypes = (): ReactElement => {
  const params: IPostgrestParams = {
    order: [
      {
        column: ***REMOVED***created_at***REMOVED***,
        dir: ***REMOVED***desc***REMOVED***,
      },
    ],
    select: [***REMOVED*******REMOVED***, ***REMOVED***document_count:document(count)***REMOVED***],
  }
  const rollups = [***REMOVED***category***REMOVED***]
  const {
    data: object_type,
    isLoading,
    error,
  } = useObjectTypeListWithRollups({
    params,
    rollups,
  })
  const invalidateCache = useCacheInvalidator({ queryKey: objectTypeListQueryKey() })

  const onDeleteItem = (): void => {
    invalidateCache()
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={object_type}>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Object types</h1>
      {object_type && (
        <>
          {object_type?.items.length === 0 ? (
            <div className="p-4">
              <p>No object types found.</p>
              <div className="mt-4">
                <Link
                  to="/object_type/create"
                  className={utils.createButtonClass({
                    size: ***REMOVED***md***REMOVED***,
                    variant: ***REMOVED***default***REMOVED***,
                  })}
                >
                  Create object type
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-row gap-4 p-2 sticky top-10 bg-white z-10">
                {Object.keys(object_type?.rollups ?? []).map((r) => {
                  const rollup = object_type?.rollups?.[r].filter(
                    (item) => item.label !== null && item.label !== ***REMOVED******REMOVED***
                  ) as IRollup[] | undefined
                  if (rollup?.length === 0) return null
                  return (
                    <div className="flex flex-row gap-2" key={r}>
                      <span className="font-semibold">
                        {r
                          .split(***REMOVED***_***REMOVED***)
                          .filter((d, i) => !(i > 0 && d === ***REMOVED***uuid***REMOVED***))
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(***REMOVED*** ***REMOVED***)}
                      </span>
                      <SelectInput
                        id={r}
                        testId={r}
                        key={r}
                        label={null}
                        size="xs"
                        options={
                          rollup?.map((item) => ({
                            label: `${item.label} (${item.count})`,
                            value: item.label,
                          })) ?? []
                        }
                      />
                    </div>
                  )
                })}
              </div>

              <Table
                className="w-full"
                rowClassName="odd:bg-slate-100"
                theadClassName="sticky top-20"
                data={object_type?.items}
                columns={[
                  {
                    label: ***REMOVED***Label***REMOVED***,
                    id: ***REMOVED***label***REMOVED***,
                    accessor: (r) => {
                      return (
                        <>
                          <Link
                            to={`/object_type/edit/${r.uuid}`}
                            className="text-blue-600 hover:underline"
                          >
                            {r.label}
                          </Link>
                          <br />
                        </>
                      )
                    },
                  },
                  {
                    label: ***REMOVED***Documents***REMOVED***,
                    id: ***REMOVED***document_count***REMOVED***,
                    cellClassName: ***REMOVED***text-center***REMOVED***,
                    accessor: (r) => {
                      const c = r.document_count?.[0]?.count ?? 0
                      return <span className=***REMOVED***text-xs text-slate-400***REMOVED***>{c > 0
                        ? <Link to={`/document?object_type_uuid=${r.uuid}`} className={
                          utils.createButtonClass({
                            variant: ***REMOVED***default***REMOVED***,
                            size: ***REMOVED***sm***REMOVED***,
                            className: ***REMOVED***px-2 py-1 bg-blue-600 text-white hover:bg-blue-700***REMOVED***,
                          })
                        }>{c}</Link>
                        : 0
                      }</span>
                    }
                  },
                  {
                    label: ***REMOVED***Category***REMOVED***,
                    id: ***REMOVED***category***REMOVED***,
                  },
                  {
                    label: ***REMOVED***Owner***REMOVED***,
                    id: ***REMOVED***owner_sub***REMOVED***,
                  },
                  {
                    label: ***REMOVED***Created at***REMOVED***,
                    id: ***REMOVED***created_at***REMOVED***,
                    accessor: (r) => dateTime(r.created_at),
                  },
                  {
                    label: ***REMOVED***Updated at***REMOVED***,
                    id: ***REMOVED***updated_at***REMOVED***,
                    accessor: (r) => (r.updated_at ? dateTime(r.updated_at) : ***REMOVED***NA***REMOVED***),
                  },
                  {
                    label: ***REMOVED***Delete***REMOVED***,
                    id: ***REMOVED***delete***REMOVED***,
                    accessor: (r) =>
                      r.category === ***REMOVED***document_file***REMOVED*** && r.slug === ***REMOVED***document_file***REMOVED*** ? (
                        <Button size="xs" className="text-gray-500 bg-slate-200" disabled={true}>
                          Protected
                        </Button>
                      ) : (
                        <DeleteButton object_type={r as IObjectType} document_count={r.document_count?.[0]?.count ?? 0} onDelete={onDeleteItem} />
                      ),
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </ViewWithLoader>
  )
}

export default ListObjectTypes
