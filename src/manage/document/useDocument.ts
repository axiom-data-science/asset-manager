import { useAuth } from '@/auth/useAuth'
import { fetchDocument } from '@/manage/document/services'
import type { IDocument, IPostgrestParams } from '@/types/types'
import { queryOptions, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

export const documentQueryKey = ({
  uuid,
  params,
}: {
  uuid: string | null
  params?: IPostgrestParams
}) => ['document', uuid, JSON.stringify(params)]

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
        uuid: uuid ?? '',
        params: params ?? {},
        token: token ?? '',
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

export const useClearDocumentQueryCache = (uuid: string | null, params?: IPostgrestParams) => {
  const queryClient = useQueryClient()
  queryClient.invalidateQueries({
    queryKey: documentQueryKey({ uuid, params }).concat('documents-list'),
  })
}
