import { useDocumentList } from '@/manage/document/useDocumentList'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import type { ReactElement } from 'react'
import type { IDefaultDocumentAttributes, IDocument, IObjectType } from '@/types/types'
import Table from '@/manage/components/table'
import Link from '@/manage/components/link'
import LockButton from '@/manage/document/lock_button'
import { useObjectTypeListAtCategory } from '../object_type/useObjectTypeList'

const ListFiles = ({ object_types }: { object_types: IObjectType[] }): ReactElement => {
  const documentFileObjectTypeUuids = object_types.map((object_type) => object_type.uuid)
  const { data: documents, isLoading, error } = useDocumentList({
    params: {
      filters: [
        {
          column: 'object_type_uuid',
          operator: 'in',
          value: documentFileObjectTypeUuids,
        },
      ],
    },
  })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Document files</h1>
      {documents && (
        <Table
          className="w-full"
          rowClassName="odd:bg-slate-100"
          theadClassName="sticky top-26"
          data={documents.items}
          columns={[
            {
              label: 'Label',
              id: 'label',
              accessor: (r) => <Link to={`/document/edit/${r.uuid}?returnToOnSuccess=/file/list`}>{r.label}</Link>,
            },
            {
              label: 'MIME type',
              id: 'attrs.mime_type',
              accessor: (r) =>
                (r.attrs as IDefaultDocumentAttributes | null)?.mime_type,
            },
            {
              label: 'Size (bytes)',
              id: 'attrs.size_bytes',
              accessor: (r) =>
                (r.attrs as IDefaultDocumentAttributes | null)?.size_bytes,
            },
            {
              id: 'locked',
              label: 'Locked',
              accessor: (r) => (
                <LockButton document={r as IDocument & { can_modify: boolean }} />
              ),
            },
            {
              label: 'Owner',
              id: 'owner_sub',
            },
            {
              label: 'Created at',
              id: 'created_at',
              accessor: (r) => new Date(r.created_at).toLocaleString(),
            },
          ]}
        />
      )}
    </ViewWithLoader>
  )
}

const ListFilesLoader = (): ReactElement => {
  const {
    data: object_types,
    isLoading,
    error,
  } = useObjectTypeListAtCategory({ category: 'document_file' })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
      {object_types && <ListFiles object_types={object_types} />}
    </ViewWithLoader>
  )
}

export default ListFilesLoader
