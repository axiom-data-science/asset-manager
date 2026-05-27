import { useAuth } from "@/auth/useAuth"
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"

const PipelineList = (): ReactElement => {
    const auth = useAuth()
    const { data, isLoading, error } = useQuery({
        queryKey: ['pipelines'],
        queryFn: async () => {
            const response = await fetch('https://protobr.srv.axds.co/backend/api/pipelines/', {
                headers: {
                    Authorization: `Bearer ${auth.user?.access_token || ''}`
                }
            })
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            return response.json()
        }
    })

    return (
        <>
            <h1 className='text-2xl font-bold mb-4'>Custom pipelines</h1>
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>
                <div className='flex flex-col gap-4'>
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