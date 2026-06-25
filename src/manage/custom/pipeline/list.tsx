import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Table, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Check, X } from ***REMOVED***lucide-react***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***

const PipelineList = (): ReactElement => {
  const auth = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: [***REMOVED***pipelines***REMOVED***],
    queryFn: async () => {
      const response = await fetch(***REMOVED***https://protobr.srv.axds.co/backend/api/pipelines/***REMOVED***, {
        headers: {
          Authorization: `Bearer ${auth.user?.access_token || ***REMOVED******REMOVED***}`,
        },
      })
      if (!response.ok) {
        throw new Error(***REMOVED***Network response was not ok***REMOVED***)
      }
      return response.json()
    },
  })

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 flex flex-row gap-2">Nina pipelines</h1>
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        <div className="flex flex-col gap-4">
          {data &&
            <Table
              data={data}
              columns={[
                {
                  label: ***REMOVED***Name***REMOVED***,
                  id: ***REMOVED***name***REMOVED***,
                  accessor: (r) => <p className=***REMOVED***flex flex-col gap-1***REMOVED***><span>{r.name}</span><span className=***REMOVED***text-xs text-slate-400***REMOVED***>{r.slug}</span></p>
                },
                {
                  label: ***REMOVED***Active***REMOVED***,
                  id: ***REMOVED***active***REMOVED***,
                  accessor: (r) => (r.active ? <Check color=***REMOVED***green***REMOVED*** /> : <X color=***REMOVED***red***REMOVED*** />),
                },
                {
                  label: ***REMOVED***Description***REMOVED***,
                  id: ***REMOVED***description***REMOVED***,
                },
                {
                  label: ***REMOVED***Created at***REMOVED***,
                  id: ***REMOVED***created***REMOVED***,
                  accessor: (r) => new Date(r.created).toLocaleString(),
                },
                {
                  label: ***REMOVED***Updated at***REMOVED***,
                  id: ***REMOVED***edited***REMOVED***,
                  accessor: (r) => new Date(r.edited).toLocaleString(),
                }
              ]}
            />
          }

        </div>
      </ViewWithLoader>
    </>
  )
}

export default PipelineList
