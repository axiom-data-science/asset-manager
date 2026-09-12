import { useAuth } from '@/auth/useAuth'
import { fetchPredicate } from '@/manage/predicate/services'
import { queryOptions, useQuery } from '@tanstack/react-query'

export const predicateQueryKey = (uuid: string) => ['predicate', uuid]

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
