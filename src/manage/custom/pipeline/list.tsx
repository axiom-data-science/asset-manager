import { useAuth } from "@/auth/useAuth"
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"

const PipelineList = (): ReactElement => {
    const auth = useAuth()
    const { data, isLoading, error } = useQuery({
        queryKey: [***REMOVED***pipelines***REMOVED***],
        queryFn: async () => {
            const response = await fetch(***REMOVED***https://protobr.srv.axds.co/backend/api/pipelines/***REMOVED***, {
                headers: {
                    Authorization: `Bearer ${auth.user?.access_token || ***REMOVED******REMOVED***}`
                }
            })
            if (!response.ok) {
                throw new Error(***REMOVED***Network response was not ok***REMOVED***)
            }
            return response.json()
        }
    })

    return (
        <>
            <h1 className=***REMOVED***text-2xl font-bold mb-4***REMOVED***>Custom pipelines</h1>
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>
                <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
                    {
                        data && data.map((pipeline: any) => (
                            <div key={pipeline.id}>
                                <h3>{pipeline.name}</h3>
                                <p>{pipeline.description}</p>
                                <pre>{JSON.stringify(pipeline, null, 2)}</pre>
                            </div>
                        ))
                    }
                </div>
            </ViewWithLoader>
        </>
    )

}

export default PipelineList