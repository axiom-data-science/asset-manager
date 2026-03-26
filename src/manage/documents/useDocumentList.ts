import { useAuth } from "@/auth/useAuth"
import { fetchDocumentRollup, fetchDocuments } from "@/manage/documents/services"
import type {  IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const useDocumentList = (params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    
    const queryResult = useQuery({
        queryKey: [***REMOVED***documents-list***REMOVED***, JSON.stringify(params)],
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchDocumentRollup({
                rollup,
                params,
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchDocuments({
                params: {
                    ...params,
                    limit: 100
                },
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })

            return {
                rollups: Object.fromEntries((rollups ?? []).map((rollup, index) => [rollup, rollupResults[index]])),
                items
            }
            
        }
    })

    return queryResult
}
