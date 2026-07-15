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
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***

const DeleteButton = ({
  object_type,
  onDelete,
}: {
  object_type: IObjectType
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
    <Button onClick={handleClick} size="xs" type="alert" className="text-white">
      {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
    </Button>
  )
}

const ListObjectTypes = (): ReactElement => {
  const queryClient = useQueryClient()
  const params: IPostgrestParams = {
    order: [
      {
        column: ***REMOVED***created_at***REMOVED***,
        dir: ***REMOVED***desc***REMOVED***,
      },
    ],
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

  const onDeleteItem = (): void => {
    queryClient.invalidateQueries({ queryKey: objectTypeListQueryKey() })
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
                    variant: ***REMOVED***primary***REMOVED***,
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
                        <DeleteButton object_type={r as IObjectType} onDelete={onDeleteItem} />
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
