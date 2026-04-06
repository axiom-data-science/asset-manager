import { useAuth } from "@/auth/useAuth"
import { fetchDocument } from "@/manage/document/services"
import type { IDocument, IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "node_modules/@tanstack/react-query/build/modern/index.d.cts"

export const useDocument = <T>(uuid: string | null, params?: IPostgrestParams): UseQueryResult<IDocument<T>> => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: [***REMOVED***documents***REMOVED***, uuid, JSON.stringify(params)],
        enabled: uuid !== null,
        queryFn: async ({ signal }): Promise<IDocument<T>> => {
            const rawDocument = await fetchDocument<T>({
                uuid: uuid ?? ***REMOVED******REMOVED***,
                params: params ?? {},
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })

            return rawDocument
            
        }
    })

    return queryResult
}
