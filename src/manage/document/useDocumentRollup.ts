import { useAuth } from "@/auth/useAuth"
import { fetchDocumentRollup } from "@/manage/document/services"
import type {  IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const useDocumentRollup = (rollup: string, params?: IPostgrestParams) => {
    const auth = useAuth()
    
    const queryResult = useQuery({
        queryKey: [***REMOVED***documents***REMOVED***, rollup, JSON.stringify(params)],
        queryFn: async ({ signal }) => {
            const items = await fetchDocumentRollup({
                rollup,
                params,
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })

            return items
            
        }
    })

    return queryResult
}
