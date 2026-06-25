import { dateTime } from ***REMOVED***@/lib/date***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { type ReactElement } from ***REMOVED***react***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { usePersonList } from ***REMOVED***./usePersonList***REMOVED***

const PersonsList = (): ReactElement => {
  const params: IPostgrestParams = {
    order: [
      {
        column: ***REMOVED***created_at***REMOVED***,
        dir: ***REMOVED***desc***REMOVED***,
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
                    label: ***REMOVED***Label***REMOVED***,
                    id: ***REMOVED***label***REMOVED***,
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
