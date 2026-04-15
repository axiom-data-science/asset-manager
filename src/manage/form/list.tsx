import type { IAssetForm, IObjectType, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { Button, SelectInput, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { CheckIcon, XIcon } from ***REMOVED***lucide-react***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import { formListQueryKey, useFormListWithRollupsAndLookups } from ***REMOVED***@/manage/form/useFormList***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { deleteForm } from ***REMOVED***./services***REMOVED***

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
      token: auth?.user?.access_token ?? ***REMOVED******REMOVED***,
    }).then(() => {
      setConfirm(false)
      onDelete()
    })
  }
  return (
    <Button onClick={handleClick} size="xs" type="alert" className="text-white">
      {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
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
                    label: `${r === ***REMOVED***object_type_uuid***REMOVED*** ? object_types_map[item.label] : item.label} (${item.count})`,
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
              label: ***REMOVED***Label***REMOVED***,
              id: ***REMOVED***label***REMOVED***,
              accessor: (r) => <Link to={`/forms/edit/${r.uuid}`}>{r.label}</Link>,
            },
            {
              label: ***REMOVED***Type***REMOVED***,
              id: ***REMOVED***object_type_uuid***REMOVED***,
              accessor: (r) => (
                <Link to={`/object_type/edit/${r.object_type_uuid}`}>
                  {object_types_map[r.object_type_uuid] ?? r.object_type_uuid}
                </Link>
              ),
            },
            {
              label: ***REMOVED***Version***REMOVED***,
              id: ***REMOVED***object_schema_version***REMOVED***,
            },
            {
              label: ***REMOVED***Is default***REMOVED***,
              id: ***REMOVED***is_schema_and_version_default***REMOVED***,
              accessor: (r) =>
                r.is_schema_and_version_default ? (
                  <CheckIcon className="text-green-500" />
                ) : (
                  <XIcon className="text-gray-300" />
                ),
            },
            {
              label: ***REMOVED***Owner***REMOVED***,
              id: ***REMOVED***owner_sub***REMOVED***,
            },
            {
              label: ***REMOVED***Config Type***REMOVED***,
              id: ***REMOVED***_type***REMOVED***,
              accessor: (r) => (r.use_form_config ? ***REMOVED***Form***REMOVED*** : ***REMOVED***Schema override***REMOVED***),
            },
            {
              label: ***REMOVED***Created at***REMOVED***,
              id: ***REMOVED***created_at***REMOVED***,
              accessor: (r) => new Date(r.created_at).toLocaleString(),
            },
            {
              label: ***REMOVED***Updated at***REMOVED***,
              id: ***REMOVED***updated_at***REMOVED***,
              accessor: (r) => new Date(r.updated_at).toLocaleString(),
            },
            {
              label: ***REMOVED***Delete***REMOVED***,
              id: ***REMOVED***delete***REMOVED***,
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
    rollups: [***REMOVED***object_type_uuid***REMOVED***],
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
