import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { keepPreviousData, queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { fetchPerson, fetchPersons } from ***REMOVED***./services***REMOVED***

export const personListQueryKey = (params?: IPostgrestParams, rollups?: string[]) =>
  [***REMOVED***person-list***REMOVED***].concat(
    (rollups ?? []).map((r) => postgrestRollupArgs({ rollupColumn: r, params }).toString()),
    params ? [postgrestRollupArgs({ rollupColumn: ***REMOVED***uuid***REMOVED***, params }).toString()] : []
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

export const usePerson = ({ uuid, sub }: { uuid?: string, sub?: string }) => {
  if(!uuid && !sub) {
    throw new Error("Either uuid or sub must be provided to usePerson")
  }
  const auth = useAuth()
  const queryResult = useQuery({
    queryKey: [***REMOVED***person***REMOVED***, uuid ?? sub],
    queryFn: async ({ signal }) => {
      const person = await fetchPerson({
        uuid,
        sub,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        signal
      })
      return person
    }
  })
  return queryResult

}
