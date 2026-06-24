import { documentListQueryKey, useDocumentListWithRollups } from ***REMOVED***@/manage/document/useDocumentList***REMOVED***
import { Button, SelectInput, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useObjectTypeList } from ***REMOVED***../object_type/useObjectTypeList***REMOVED***
import type { IDocument, IObjectType, IPostgrestParams, IRollup } from ***REMOVED***@/types/types***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { deleteDocument } from ***REMOVED***./services***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { X, CheckIcon, Lock, Unlock } from ***REMOVED***lucide-react***REMOVED***

const DeleteButton = ({
  document,
  onDelete,
}: {
  document: IDocument
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
    <Button onClick={handleClick} size="xs" type="alert" className="text-white">
      {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
    </Button>
  )
}

const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {
  const uuidsForDocuments = object_types
    .filter((ot) => ot.category === ***REMOVED***document***REMOVED***)
    .map((ot) => ot.uuid)

  const params: IPostgrestParams = {
    filters: [
      {
        column: ***REMOVED***object_type_uuid***REMOVED***,
        value: uuidsForDocuments,
        operator: ***REMOVED***in***REMOVED***,
      },
    ],
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
  const {
    data: documents,
    isLoading,
    error,
  } = useDocumentListWithRollups({
    params,
    targetedParams,
    rollups,
  })
  const auth = useAuth()
  const object_types_map = Object.fromEntries(object_types.map((ot) => [ot.uuid, ot]))
  const queryClient = useQueryClient()
  const onDeleteItem = (): void => {
    queryClient.invalidateQueries({ queryKey: documentListQueryKey({}) })
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Documents</h1>
      <div className="flex flex-row gap-4 p-2 sticky top-10 bg-white z-10">
        {Object.keys(documents?.rollups ?? []).map((r) => {
          const rollup = documents?.rollups?.[r].filter(
            (item) => item.label !== null && item.label !== ***REMOVED******REMOVED***
          ) as IRollup[] | undefined
          if (rollup?.length === 0) return null
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
                options={
                  rollup?.map((item) => ({
                    label: `${r === ***REMOVED***object_type_uuid***REMOVED*** ? object_types_map[item.label]?.label : item.label} (${item.count})`,
                    value: item.label,
                  })) ?? []
                }
              />
            </div>
          )
        })}
      </div>
      {documents && (
        <Table
          className="w-full"
          rowClassName="odd:bg-slate-100"
          theadClassName="sticky top-26"
          data={documents?.items}
          columns={[
            {
              label: ***REMOVED***Label***REMOVED***,
              id: ***REMOVED***label***REMOVED***,
              accessor: (r) => (
                <>
                  {r.can_modify === true ? (
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
              accessor: (r) =>
                r.published ? (
                  <>
                    <CheckIcon color="green" className="mx-auto" />
                    <p className="text-[10px] text-slate-400 text-center">
                      {r.published_at ? new Date(r.published_at).toLocaleString() : ***REMOVED******REMOVED***}
                    </p>
                  </>
                ) : (
                  <X color="red" className="mx-auto" />
                ),
            },
            {
              id: ***REMOVED***locked***REMOVED***,
              label: ***REMOVED***Locked***REMOVED***,
              accessor: (r) =>
                r.lock_sub ? (
                  <>
                    <Lock
                      color={`${r.lock_sub === auth?.user?.profile?.sub ? ***REMOVED***green***REMOVED*** : ***REMOVED***red***REMOVED***}`}
                      className="mx-auto"
                    />
                    <p className="text-[10px] text-slate-400 text-center">
                      {r.locked_at ? new Date(r.locked_at).toLocaleString() : ***REMOVED******REMOVED***}
                    </p>
                  </>
                ) : (
                  <Unlock color="green" className="mx-auto" />
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
                  <DeleteButton document={r as IDocument} onDelete={onDeleteItem} />
                ) : null
              },
            },
          ]}
        />
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
