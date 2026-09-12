import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchPredicate } from ***REMOVED***@/manage/predicate/services***REMOVED***
import { queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

export const predicateQueryKey = (uuid: string) => [***REMOVED***predicate***REMOVED***, uuid]

export const getPredicateQuery = ({ uuid, token }: { uuid: string; token?: string }) => {
    return queryOptions({
        queryKey: predicateQueryKey(uuid),
        queryFn: async ({ signal }) => {
            return fetchPredicate({ uuid, token, signal })
        },
    })
}

export const usePredicate = ({ uuid }: { uuid: string }) => {
    const auth = useAuth()
    const queryResult = useQuery(getPredicateQuery({ uuid, token: auth.user?.access_token }))
    return queryResult
}
