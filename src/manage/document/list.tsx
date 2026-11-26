import { documentListQueryKey, useDocumentListWithRollups } from '@/manage/document/useDocumentList'
import {
  Button,
  Input,
  Loader,
  SelectInput,
  ViewWithLoader,
} from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useObjectTypeList } from '../object_type/useObjectTypeList'
import type {
  IDocument,
  IObjectType,
  IPostgrestFilter,
  IPostgrestParams,
  IRollup,
} from '@/types/types'
import Table from '@/manage/components/table'
import Link from '@/manage/components/link'
import { useAuth } from '@/auth/useAuth'
import { deleteDocument } from './services'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import PublishedButton from './publish_button'
import LockButton from './lock_button'

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
      token: auth?.user?.access_token ?? '',
    }).then(() => {
      onDelete()
    })
  }
  return (
    <span className="flex flex-col gap-2">
      <span className="flex flex-row items-center gap-2">
        <Button
          onClick={handleClick}
          disabled={document.can_modify === false || document.lock_sub !== null}
          size="xs"
          type="alert"
          className="text-white"
        >
          {confirm ? 'Confirm' : 'Delete'}
        </Button>
        {confirm && (
          <Button
            onClick={() => setConfirm(false)}
            size="xs"
            variant="ghost"
            type="secondary"
            className="text-slate-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </span>
    </span>
  )
}


const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {
  const [contextState] = useAtom(contextStateAtom)
  const { person_by_owner_sub } = contextState
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const returnToQuery = new URLSearchParams({
    returnToOnSuccess: `${location.pathname}${location.search}`,
  }).toString()

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
    .filter((ot) => ot.category === 'document')
    .map((ot) => ot.uuid)

  const defaultFilters: IPostgrestFilter[] = [
    {
      column: 'object_type_uuid',
      value: uuidsForDocuments,
      operator: 'in',
    },
  ]

  const userFilters: IPostgrestFilter[] =
    filters !== undefined
      ? (Object.keys(filters)
        .map((k) => {
          return filters[k] !== undefined
            ? k === 'search'
              ? {
                column: 'label',
                value: `%${String(filters[k])}%`,
                operator: 'ilike',
              }
              : {
                column: k,
                value: String(filters[k]),
                operator: 'eq',
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
          column: 'created_at',
          dir: 'desc',
        },
      ],
    },
  }

  const rollups = ['owner_sub', 'object_type_uuid']

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
            (item) => item.label !== null && item.label !== ''
          ) as IRollup[] | undefined
          return (
            <div className="flex flex-row gap-2" key={r}>
              <span className="font-semibold">
                {r
                  .split('_')
                  .filter((w, i) => i < 1 || w.toLowerCase() !== 'uuid')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
              <SelectInput
                id={r}
                testId={r}
                key={r}
                label={null}
                size="xs"
                value={filters?.[r] ?? undefined}
                className="w-40"
                useNative={true}
                options={
                  rollup?.map((item) => ({
                    label: `${r === 'object_type_uuid'
                      ? object_types_map[item.label]?.label
                      : r === 'owner_sub'
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
              label: 'Label',
              id: 'label',
              accessor: (r) => (
                <>
                  {r.can_modify === true ? (
                    <Link to={`/document/edit/${r.uuid}?${returnToQuery}`}>{r.label}</Link>
                  ) : (
                    r.label
                  )}
                </>
              ),
            },
            {
              id: 'published',
              label: 'Published',
              accessor: (r) => (
                <PublishedButton document={r as IDocument & { can_modify: boolean }} />
              ),
            },
            {
              id: 'locked',
              label: 'Locked',
              accessor: (r) => (
                <LockButton
                  document={r as IDocument & { can_modify: boolean }}
                  onChange={refetchList}
                />
              ),
            },
            {
              label: 'Type',
              id: 'object_type_uuid',
              accessor: (r) => (
                <Link to={`/object_type/edit/${r.object_type_uuid}`}>
                  {object_types_map[r.object_type_uuid]?.label ?? r.object_type_uuid}
                </Link>
              ),
            },
            {
              label: 'Owner',
              id: 'owner_sub',
            },
            {
              label: 'Updated',
              id: 'updated_at',
              accessor: (r) => new Date(r.updated_at).toLocaleString(),
            },
            {
              label: 'Created',
              id: 'created_at',
              accessor: (r) => new Date(r.created_at).toLocaleString(),
            },
            {
              label: 'Delete',
              id: 'delete',
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
