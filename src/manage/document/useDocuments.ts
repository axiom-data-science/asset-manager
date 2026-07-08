import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchDocuments } from ***REMOVED***@/manage/document/services***REMOVED***
import type { IDocument, IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { useQuery, type UseQueryResult } from ***REMOVED***@tanstack/react-query***REMOVED***

export const useDocuments = <T>(params?: IPostgrestParams): UseQueryResult<IDocument<T>[]> => {
  const auth = useAuth()
  const queryResult = useQuery({
    queryKey: [***REMOVED***documents***REMOVED***, JSON.stringify(params)],
    queryFn: async ({ signal }): Promise<IDocument<T>[]> => {
      const rawDocuments = await fetchDocuments<T>({
        params: params ?? {},
        token: auth.user?.access_token || ***REMOVED******REMOVED***,
        signal,
      })

      return rawDocuments
    },
  })

  return queryResult
}
