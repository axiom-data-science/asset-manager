import { documentListQueryKey, useDocumentListWithRollups } from '@/manage/document/useDocumentList'
import { Button, SelectInput, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useObjectTypeList } from '../object_type/useObjectTypeList'
import type { IDocument, IObjectType, IPostgrestParams, IRollup } from '@/types/types'
import Table from '@/manage/components/table'
import Link from '@/manage/components/link'
import { useAuth } from '@/auth/useAuth'
import { deleteDocument } from './services'
import { useQueryClient } from '@tanstack/react-query'
import { X, CheckIcon } from 'lucide-react'

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
      token: auth?.user?.access_token ?? '',
    }).then(() => {
      onDelete()
    })
  }
  return (
    <Button onClick={handleClick} size="xs" type="alert" className="text-white">
      {confirm ? 'Confirm' : 'Delete'}
    </Button>
  )
}

const ListDocuments = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {
  const uuidsForDocuments = object_types
    .filter((ot) => ot.category === 'document')
    .map((ot) => ot.uuid)

  const params: IPostgrestParams = {
    filters: [
      {
        column: 'object_type_uuid',
        value: uuidsForDocuments,
        operator: 'in',
      },
    ],
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
  const {
    data: documents,
    isLoading,
    error,
  } = useDocumentListWithRollups({
    params,
    targetedParams,
    rollups,
  })
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
            (item) => item.label !== null && item.label !== ''
          ) as IRollup[] | undefined
          if (rollup?.length === 0) return null
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
                options={
                  rollup?.map((item) => ({
                    label: `${r === 'object_type_uuid' ? object_types_map[item.label]?.label : item.label} (${item.count})`,
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
              label: 'Label',
              id: 'label',
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
              id: 'public',
              label: 'Is public',
              accessor: (r) => (r.public ? <CheckIcon color="green" /> : <X color="red" />),
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
              accessor: (r) => <DeleteButton document={r as IDocument} onDelete={onDeleteItem} />,
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
