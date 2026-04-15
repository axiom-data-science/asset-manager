import type { IAssetForm, IObjectType, IRollup } from '@/types/types'
import { Button, SelectInput, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useAuth } from '@/auth/useAuth'
import { CheckIcon, XIcon } from 'lucide-react'
import Link from '@/manage/components/link'
import Table from '@/manage/components/table'
import { formListQueryKey, useFormListWithRollupsAndLookups } from '@/manage/form/useFormList'
import { useQueryClient } from '@tanstack/react-query'
import { deleteForm } from './services'

const DeleteButton = ({
  assetForm,
  onDelete,
}: {
  assetForm: IAssetForm
  onDelete: () => void
}): ReactElement => {
  const [confirm, setConfirm] = useState(false)
  const auth = useAuth()
  const handleClick = (): void => {
    if (!confirm) {
      setConfirm(true)
    } else {
      handleDelete()
    }
  }
  const handleDelete = (): void => {
    deleteForm({
      uuid: assetForm.uuid,
      token: auth?.user?.access_token ?? '',
    }).then(() => {
      setConfirm(false)
      onDelete()
    })
  }
  return (
    <Button onClick={handleClick} size="xs" type="alert" className="text-white">
      {confirm ? 'Confirm' : 'Delete'}
    </Button>
  )
}

const ListFormTable = ({
  object_types,
  forms,
}: {
  object_types: IObjectType[]
  forms: { items: IAssetForm[]; rollups: Record<string, IRollup[]> }
}): ReactElement => {
  const object_types_map = Object.fromEntries(object_types.map((ot) => [ot.uuid, ot.label]))
  const queryClient = useQueryClient()
  const onDeleteItem = (): void => {
    queryClient.invalidateQueries({ queryKey: formListQueryKey({}) })
  }
  return (
    <>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Forms</h1>
      <div className="flex flex-row gap-4 p-2 sticky top-10 bg-white z-10">
        {Object.keys(forms?.rollups ?? []).map((r) => {
          const rollup = forms?.rollups?.[r].filter(
            (item) => item.label !== null && item.label !== ''
          ) as IRollup[] | undefined
          if (rollup?.length === 0) return null
          return (
            <div className="flex flex-row gap-2" key={r}>
              <span className="font-semibold">
                {r
                  .split('_')
                  .filter((d, i) => !(i > 0 && d === 'uuid'))
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
                    label: `${r === 'object_type_uuid' ? object_types_map[item.label] : item.label} (${item.count})`,
                    value: item.label,
                  })) ?? []
                }
              />
            </div>
          )
        })}
      </div>
      {forms && (
        <Table
          className="w-full"
          rowClassName="odd:bg-slate-100"
          theadClassName="sticky top-26"
          tbodyClassName="text-sm"
          data={forms?.items}
          columns={[
            {
              label: 'Label',
              id: 'label',
              accessor: (r) => <Link to={`/forms/edit/${r.uuid}`}>{r.label}</Link>,
            },
            {
              label: 'Type',
              id: 'object_type_uuid',
              accessor: (r) => (
                <Link to={`/object_type/edit/${r.object_type_uuid}`}>
                  {object_types_map[r.object_type_uuid] ?? r.object_type_uuid}
                </Link>
              ),
            },
            {
              label: 'Version',
              id: 'object_schema_version',
            },
            {
              label: 'Is default',
              id: 'is_schema_and_version_default',
              accessor: (r) =>
                r.is_schema_and_version_default ? (
                  <CheckIcon className="text-green-500" />
                ) : (
                  <XIcon className="text-gray-300" />
                ),
            },
            {
              label: 'Owner',
              id: 'owner_sub',
            },
            {
              label: 'Config Type',
              id: '_type',
              accessor: (r) => (r.use_form_config ? 'Form' : 'Schema override'),
            },
            {
              label: 'Created at',
              id: 'created_at',
              accessor: (r) => new Date(r.created_at).toLocaleString(),
            },
            {
              label: 'Updated at',
              id: 'updated_at',
              accessor: (r) => new Date(r.updated_at).toLocaleString(),
            },
            {
              label: 'Delete',
              id: 'delete',
              accessor: (r) => <DeleteButton assetForm={r as IAssetForm} onDelete={onDeleteItem} />,
            },
          ]}
        />
      )}
    </>
  )
}

const ListForm = (): ReactElement => {
  const auth = useAuth()
  const { data, isLoading, error } = useFormListWithRollupsAndLookups({
    rollups: ['object_type_uuid'],
  })
  if (!auth.user) {
    return (
      <div className="p-20">
        <p>You must be logged in to view object schemas.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && <ListFormTable object_types={data.object_types} forms={data.forms} />}
    </ViewWithLoader>
  )
}

export default ListForm
