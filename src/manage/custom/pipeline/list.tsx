import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
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
      <h1 className="text-2xl font-bold mb-4">Custom pipelines</h1>
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        <div className="flex flex-col gap-4">
          {data &&
            data.map((pipeline: { id: string; name: string; description: string }) => (
              <div key={pipeline.id}>
                <h3>{pipeline.name}</h3>
                <p>{pipeline.description}</p>
                <pre>{JSON.stringify(pipeline, null, 2)}</pre>
              </div>
            ))}
        </div>
      </ViewWithLoader>
    </>
  )
}

export default PipelineList
