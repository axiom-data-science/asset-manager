import { useAuth } from '@/auth/useAuth'
import { postgrestRollupArgs } from '@/services/postgrest/endpoints'
import type { IPostgrestParams } from '@/types/types'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchPersons } from './services'

export const personListQueryKey = (params?: IPostgrestParams, rollups?: string[]) =>
  ['person-list'].concat(
    (rollups ?? []).map((r) => postgrestRollupArgs({ rollupColumn: r, params }).toString())
  )

export const getPersonListQuery = ({
  params,
  token,
}: {
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: personListQueryKey(params),
    queryFn: async ({ signal }) => {
      const items = await fetchPersons({
        params: {
          ...params,
          limit: 100,
        },
        token: token ?? '',
        signal,
      })
      return items
    },
  })
}

export const usePersonList = ({ params }: { params?: IPostgrestParams } = {}) => {
  const auth = useAuth()
  const queryResult = useQuery(getPersonListQuery({ params, token: auth.user?.access_token }))
  return queryResult
}
