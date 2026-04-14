import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import type { IDocument, IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import type { UseQueryResult } from ***REMOVED***node_modules/@tanstack/react-query/build/modern/index.d.cts***REMOVED***

export const documentQueryKey = ({
  uuid,
  params,
}: {
  uuid: string | null
  params?: IPostgrestParams
}) => [***REMOVED***document***REMOVED***, uuid, JSON.stringify(params)]

export const getDocumentQuery = <T>({
  uuid,
  params,
  token,
}: {
  uuid: string | null
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: documentQueryKey({ uuid, params }),
    enabled: uuid !== null,
    queryFn: async ({ signal }): Promise<IDocument<T>> => {
      const rawDocument = await fetchDocument<T>({
        uuid: uuid ?? ***REMOVED******REMOVED***,
        params: params ?? {},
        token: token ?? ***REMOVED******REMOVED***,
        signal,
      })

      return rawDocument
    },
  })
}

export const useDocument = <T>(
  uuid: string | null,
  params?: IPostgrestParams
): UseQueryResult<IDocument<T>> => {
  const auth = useAuth()
  const queryResult = useQuery(
    getDocumentQuery<T>({ uuid, params, token: auth.user?.access_token })
  )
  return queryResult
}
