import { documentListQueryKey, useDocumentListWithRollups } from ***REMOVED***@/manage/document/useDocumentList***REMOVED***
import {
  Button,
  Input,
  Loader,
  SelectInput,
  Tooltip,
  ViewWithLoader,
} from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import { useObjectTypeList } from ***REMOVED***../object_type/useObjectTypeList***REMOVED***
import type {
  IDocument,
  IObjectType,
  IPostgrestFilter,
  IPostgrestParams,
  IRollup,
} from ***REMOVED***@/types/types***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { deleteDocument, patchDocument } from ***REMOVED***./services***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Lock, Unlock, UserRoundKey, Globe } from ***REMOVED***lucide-react***REMOVED***
import contextStateAtom from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***

const DeleteButton = ({
  document,
  onDelete,
}: {
  document: IDocument & { can_modify: boolean }
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
    deleteDocument({
      uuid: document.uuid,
      token: auth?.user?.access_token ?? ***REMOVED******REMOVED***,
    }).then(() => {
      onDelete()
    })
  }
  return (
    <Button
      onClick={handleClick}
      disabled={document.can_modify === false || document.lock_sub !== null}
      size="xs"
      type="alert"
      className="text-white"
    >
      {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
    </Button>
  )
}

const PublishedButton = ({
  document,
  onChange,
}: {
  document: IDocument & { can_modify: boolean }
  onChange?: (published: boolean) => void
}): ReactElement => {
  const auth = useAuth()
  const [updating, setUpdating] = useState(false)
  const [published, setPublished] = useState(document.published)
  const [publishedAt, setPublishedAt] = useState(document.published_at)
  const handleClick = (): void => {
    const pubToSet = !published
    setUpdating(true)
    patchDocument({
      token: auth?.user?.access_token ?? ***REMOVED******REMOVED***,
      uuid: document.uuid,
      document: {
        published: pubToSet,
      },
    })
      .then(() => {
        onChange?.(pubToSet)
        setPublished(pubToSet)
        setPublishedAt(pubToSet ? new Date().toISOString() : null)
      })
      .finally(() => {
        setUpdating(false)
      })
  }
  return (
    <div className="text-center flex flex-col gap-2">
      <Tooltip
        content={
          document.published ? ***REMOVED***Click to unpublish this document***REMOVED*** : ***REMOVED***Click to publish this document***REMOVED***
        }
        dark={true}
        useSpan={true}
        className="block text-center"
      >
        <Button
          onClick={handleClick}
          disabled={document.can_modify === false || document.lock_sub !== null}
          size="xs"
          variant="ghost"
        >
          {updating ? (
            <Loader className="w-8 h-8" />
          ) : published ? (
            <Globe color="green" className="mx-auto w-8 h-8" />
          ) : (
            <UserRoundKey color="red" className="mx-auto w-8 h-8" />
          )}
        </Button>
      </Tooltip>

      <>
        {published && publishedAt && (
          <p className="text-[10px] text-slate-400 text-center">
            {new Date(publishedAt).toLocaleString()}
          </p>
        )}
      </>
    </div>
  )
}

const LockButton = ({
  document,
  onChange,
}: {
  document: IDocument & { can_modify: boolean }
  onChange?: (locked_at: string | null) => void
}): ReactElement => {
  const auth = useAuth()
  const canModify = document.lock_sub === auth?.user?.profile?.sub || auth.isAdmin
  const [updating, setUpdating] = useState(false)
  const [locked, setLocked] = useState(document.locked_at !== null)
  const [lockedAt, setLockedAt] = useState(document.locked_at)
  const handleClick = (): void => {
    const lockToSet = !locked ? new Date().toISOString() : null
    const lockSubToSet = !locked ? (auth?.user?.profile?.sub ?? null) : null
    setUpdating(true)
    patchDocument({
      token: auth?.user?.access_token ?? ***REMOVED******REMOVED***,
      uuid: document.uuid,
      document: {
        locked_at: lockToSet,
        lock_sub: lockSubToSet,
      },
    })
      .then(() => {
        onChange?.(lockToSet)
        setLocked(lockToSet !== null)
        setLockedAt(lockToSet)
      })
      .finally(() => {
        setUpdating(false)
      })
  }
  if (!canModify) {
    return (
      <span>
        {locked ? (
          <Lock color="slate-400" className="mx-auto w-8 h-8" />
        ) : (
          <Unlock color="slate-400" className="mx-auto w-8 h-8" />
        )}
      </span>
    )
  }
  return (
    <div className="text-center flex flex-col gap-2">
      <Tooltip
        content={locked ? ***REMOVED***Click to unlock this document***REMOVED*** : ***REMOVED***Click to lock this document***REMOVED***}
        dark={true}
        useSpan={true}
        className="block text-center"
      >
        <Button
          onClick={handleClick}
          disabled={document.can_modify === false || !canModify}
          size="xs"
          variant="ghost"
        >
          {updating ? (
            <Loader className="w-8 h-8" />
          ) : locked ? (
            <Lock color="green" className="mx-auto w-8 h-8" />
          ) : (
            <Unlock color="red" className="mx-auto w-8 h-8" />
          )}
        </Button>
      </Tooltip>

      <>
        {locked && lockedAt && (
          <p className="text-[10px] text-slate-400 text-center">
            {new Date(lockedAt).toLocaleString()}
          </p>
        )}
      </>
    </div>
  )
}

const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const { person_by_owner_sub } = contextState
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: Record<string, string | undefined> = Object.fromEntries(
    Array.from(searchParams.entries())
  )

  const setFilters = (
    updater: (prev: Record<string, string | undefined>) => Record<string, string | undefined>
  ): void => {
    const next = updater(filters)
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev)
        // Remove all filter keys then re-apply
        Array.from(newParams.keys()).forEach((k) => newParams.delete(k))
        Object.entries(next).forEach(([k, v]) => {
          if (v !== undefined) newParams.set(k, v)
        })
        return newParams
      },
      { replace: true }
    )
  }

  const uuidsForDocuments = object_types
    .filter((ot) => ot.category === ***REMOVED***document***REMOVED***)
    .map((ot) => ot.uuid)

  const defaultFilters: IPostgrestFilter[] = [
    {
      column: ***REMOVED***object_type_uuid***REMOVED***,
      value: uuidsForDocuments,
      operator: ***REMOVED***in***REMOVED***,
    },
  ]

  const userFilters: IPostgrestFilter[] =
    filters !== undefined
      ? (Object.keys(filters)
        .map((k) => {
          return filters[k] !== undefined
            ? k === ***REMOVED***search***REMOVED***
              ? {
                column: ***REMOVED***label***REMOVED***,
                value: `%${String(filters[k])}%`,
                operator: ***REMOVED***ilike***REMOVED***,
              }
              : {
                column: k,
                value: String(filters[k]),
                operator: ***REMOVED***eq***REMOVED***,
              }
            : null
        })
        .filter((f) => f !== null) as IPostgrestFilter[])
      : []

  const params: IPostgrestParams = {
    filters: defaultFilters.concat(userFilters),
  }

  const targetedParams: Record<string, IPostgrestParams> = {
    document: {
      order: [
        {
          column: ***REMOVED***created_at***REMOVED***,
          dir: ***REMOVED***desc***REMOVED***,
        },
      ],
    },
  }

  const rollups = [***REMOVED***owner_sub***REMOVED***, ***REMOVED***object_type_uuid***REMOVED***]

  rollups.forEach((r) => {
    if (userFilters.find((f) => f.column === r)) {
      targetedParams[r] = {
        ...targetedParams[r],
        filters: userFilters.filter((f) => {
          return f.column !== r
        }),
      }
    }
  })

  const {
    data: documents,
    isLoading,
    error,
    isRefetching,
  } = useDocumentListWithRollups({
    params,
    targetedParams,
    rollups,
  })
  const object_types_map = Object.fromEntries(object_types.map((ot) => [ot.uuid, ot]))
  const queryClient = useQueryClient()
  const refetchList = (): void => {
    queryClient.invalidateQueries({ queryKey: documentListQueryKey({}) })
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
      <div className="flex flex-row gap-4 p-2 py-4 sticky top-12 bg-white z-10">
        {(rollups ?? []).map((r) => {
          const rollup = documents?.rollups?.[r].filter(
            (item) => item.label !== null && item.label !== ***REMOVED******REMOVED***
          ) as IRollup[] | undefined
          return (
            <div className="flex flex-row gap-2" key={r}>
              <span className="font-semibold">
                {r
                  .split(***REMOVED***_***REMOVED***)
                  .filter((w, i) => i < 1 || w.toLowerCase() !== ***REMOVED***uuid***REMOVED***)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(***REMOVED*** ***REMOVED***)}
              </span>
              <SelectInput
                id={r}
                testId={r}
                key={r}
                label={null}
                size="xs"
                value={filters?.[r] ?? undefined}
                className="w-40"
                options={
                  rollup?.map((item) => ({
                    label: `${r === ***REMOVED***object_type_uuid***REMOVED***
                        ? object_types_map[item.label]?.label
                        : r === ***REMOVED***owner_sub***REMOVED***
                          ? (person_by_owner_sub[item.label]?.label ?? item.label)
                          : item.label
                      } (${item.count})`,
                    value: item.label,
                  })) ?? []
                }
                onChange={(o) => {
                  setFilters((prev) => ({
                    ...prev,
                    [r]: o?.value ? String(o.value) : undefined,
                  }))
                }}
              />
            </div>
          )
        })}
        <div className="flex flex-row gap-2">
          <span className="font-semibold">Search</span>
          <Input
            id="search"
            testId="search"
            label={null}
            size="xs"
            value={filters?.search ?? undefined}
            placeholder="Search"
            className="h-6"
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                search: e,
              }))
            }}
          />
        </div>
      </div>
      {documents && (
        <Table
          className="w-full"
          rowClassName="odd:bg-slate-100"
          theadClassName="sticky top-22"
          data={documents?.items}
          columns={[
            {
              label: ***REMOVED***Label***REMOVED***,
              id: ***REMOVED***label***REMOVED***,
              accessor: (r) => (
                <>
                  {r.can_modify === true && r.lock_sub === null ? (
                    <Link to={`/document/edit/${r.uuid}`}>{r.label}</Link>
                  ) : (
                    r.label
                  )}
                </>
              ),
            },
            {
              id: ***REMOVED***published***REMOVED***,
              label: ***REMOVED***Published***REMOVED***,
              accessor: (r) => (
                <PublishedButton document={r as IDocument & { can_modify: boolean }} />
              ),
            },
            {
              id: ***REMOVED***locked***REMOVED***,
              label: ***REMOVED***Locked***REMOVED***,
              accessor: (r) => (
                <LockButton
                  document={r as IDocument & { can_modify: boolean }}
                  onChange={refetchList}
                />
              ),
            },
            {
              label: ***REMOVED***Type***REMOVED***,
              id: ***REMOVED***object_type_uuid***REMOVED***,
              accessor: (r) => (
                <Link to={`/object_type/edit/${r.object_type_uuid}`}>
                  {object_types_map[r.object_type_uuid]?.label ?? r.object_type_uuid}
                </Link>
              ),
            },
            {
              label: ***REMOVED***Owner***REMOVED***,
              id: ***REMOVED***owner_sub***REMOVED***,
            },
            {
              label: ***REMOVED***Updated***REMOVED***,
              id: ***REMOVED***updated_at***REMOVED***,
              accessor: (r) => new Date(r.updated_at).toLocaleString(),
            },
            {
              label: ***REMOVED***Created***REMOVED***,
              id: ***REMOVED***created_at***REMOVED***,
              accessor: (r) => new Date(r.created_at).toLocaleString(),
            },
            {
              label: ***REMOVED***Delete***REMOVED***,
              id: ***REMOVED***delete***REMOVED***,
              accessor: (r) => {
                return r.can_modify ? (
                  <DeleteButton
                    document={r as IDocument & { can_modify: boolean }}
                    onDelete={refetchList}
                  />
                ) : null
              },
            },
          ]}
        />
      )}
      {isRefetching && (
        <div className="absolute top-0 left-0 w-full h-full bg-white/20 flex items-center justify-center">
          <Loader className="w-12 h-12" />
        </div>
      )}
    </ViewWithLoader>
  )
}

const ListDocumentsLoader = (): ReactElement => {
  const { data: object_types, isLoading, error } = useObjectTypeList()
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
      {object_types && <ListDocuments object_types={object_types} />}
    </ViewWithLoader>
  )
}

export default ListDocumentsLoader
