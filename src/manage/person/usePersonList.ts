import { useAuth } from '@/auth/useAuth'
import { postgrestRollupArgs } from '@/services/postgrest/endpoints'
import type { IPostgrestParams } from '@/types/types'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { fetchPerson, fetchPersons } from './services'

export const personListQueryKey = (params?: IPostgrestParams, rollups?: string[]) =>
  ['person-list'].concat(
    (rollups ?? []).map((r) => postgrestRollupArgs({ rollupColumn: r, params }).toString()),
    params ? [postgrestRollupArgs({ rollupColumn: 'uuid', params }).toString()] : []
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
    placeholderData: keepPreviousData,
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

export const usePerson = ({ uuid, sub }: { uuid?: string, sub?: string }) => {
  if(!uuid && !sub) {
    throw new Error("Either uuid or sub must be provided to usePerson")
  }
  const auth = useAuth()
  const queryResult = useQuery({
    queryKey: ['person', uuid ?? sub],
    queryFn: async ({ signal }) => {
      const person = await fetchPerson({
        uuid,
        sub,
        token: auth.user?.access_token ?? '',
        signal
      })
      return person
    }
  })
  return queryResult

}
