import { useAuth } from '@/auth/useAuth'
import { fetchDocuments } from '@/manage/document/services'
import type { IDocument, IPostgrestParams } from '@/types/types'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

export const useDocuments = <T>(params?: IPostgrestParams): UseQueryResult<IDocument<T>[]> => {
  const auth = useAuth()
  const queryResult = useQuery({
    queryKey: ['documents', JSON.stringify(params)],
    queryFn: async ({ signal }): Promise<IDocument<T>[]> => {
      const rawDocuments = await fetchDocuments<T>({
        params: params ?? {},
        token: auth.user?.access_token || '',
        signal,
      })

      return rawDocuments
    },
  })

  return queryResult
}
