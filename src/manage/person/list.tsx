import { dateTime } from '@/lib/date'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { type ReactElement } from 'react'
import Table from '@/manage/components/table'
import type { IPostgrestParams } from '@/types/types'
import { usePersonList } from './usePersonList'

const PersonsList = (): ReactElement => {
  const params: IPostgrestParams = {
    order: [
      {
        column: 'created_at',
        dir: 'desc',
      },
    ],
  }
  const {
    data: persons,
    isLoading,
    error,
  } = usePersonList({
    params,
  })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={persons}>
      <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Persons</h1>
      {persons && (
        <>
          {persons.length === 0 ? (
            <div className="p-4">
              <p>No persons found.</p>
            </div>
          ) : (
            <>
              <Table
                className="w-full"
                rowClassName="odd:bg-slate-100"
                theadClassName="sticky top-26"
                data={persons}
                columns={[
                  {
                    label: 'Label',
                    id: 'label',
                  },
                  {
                    label: 'Owner',
                    id: 'owner_sub',
                  },
                  {
                    label: 'Created at',
                    id: 'created_at',
                    accessor: (r) => dateTime(r.created_at),
                  },
                  {
                    label: 'Updated at',
                    id: 'updated_at',
                    accessor: (r) => (r.updated_at ? dateTime(r.updated_at) : 'NA'),
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

export default PersonsList
