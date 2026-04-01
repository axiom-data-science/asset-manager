import { useAuth } from "@/auth/useAuth"
import { fetchDocuments } from "@/manage/document/services"
import type { IDocument, IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "node_modules/@tanstack/react-query/build/modern/index.d.cts"

export const useDocuments = <T>(params?: IPostgrestParams): UseQueryResult<IDocument<T>[]> => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: [***REMOVED***documents***REMOVED***, JSON.stringify(params)],
        queryFn: async ({ signal }): Promise<IDocument<T>[]> => {
            const rawDocuments = await fetchDocuments<T>({
                params: params ?? {},
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })

            return rawDocuments
            
        }
    })

    return queryResult
}
