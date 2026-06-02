import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { fetchPersons } from ***REMOVED***./services***REMOVED***

export const personListQueryKey = (params?: IPostgrestParams, rollups?: string[]) =>
  [***REMOVED***person-list***REMOVED***].concat(
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
        token: token ?? ***REMOVED******REMOVED***,
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
