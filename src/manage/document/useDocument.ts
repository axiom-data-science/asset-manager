import { useAuth } from "@/auth/useAuth"
import { fetchDocument } from "@/manage/document/services"
import type { IDocument, IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "node_modules/@tanstack/react-query/build/modern/index.d.cts"

export const documentQueryKey = (uuid: string | null, params?: IPostgrestParams) => [***REMOVED***document***REMOVED***, uuid, JSON.stringify(params)]

export const getDocumentQuery = <T>({uuid, params, token}: {uuid: string | null, params?: IPostgrestParams, token?: string}) => {
    return queryOptions({
        queryKey: documentQueryKey(uuid, params),
        enabled: uuid !== null,
        queryFn: async ({ signal }): Promise<IDocument<T>> => {
            const rawDocument = await fetchDocument<T>({
                uuid: uuid ?? ***REMOVED******REMOVED***,
                params: params ?? {},
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })

            return rawDocument
            
        }
    })
}


export const useDocument = <T>(uuid: string | null, params?: IPostgrestParams): UseQueryResult<IDocument<T>> => {
    const auth = useAuth()
    const queryResult = useQuery(getDocumentQuery<T>({uuid, params, token: auth.user?.access_token}))
    return queryResult
}
