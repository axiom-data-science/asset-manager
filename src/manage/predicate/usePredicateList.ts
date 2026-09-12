import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchPredicateRollup, fetchPredicates } from ***REMOVED***@/manage/predicate/services***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { keepPreviousData, queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

export const predicateListQueryKey = ({
    params,
    rollups,
}: {
    params?: IPostgrestParams
    rollups?: string[]
}) =>
    [***REMOVED***predicate***REMOVED***, ***REMOVED***predicate-list***REMOVED***].concat(
        (rollups ?? []).map((r) =>
            postgrestRollupArgs({
                rollupColumn: r,
                params: params ? (omit(params, [***REMOVED***order***REMOVED***]) as IPostgrestParams) : undefined,
            }).toString()
        )
    )

export const getPredicateListWithRollupsQuery = ({
    params,
    targetedParams,
    rollups,
    token,
}: {
    params?: IPostgrestParams
    targetedParams?: Record<string, IPostgrestParams>
    rollups?: string[]
    token?: string
}) => {
    return queryOptions({
        queryKey: predicateListQueryKey({ params, rollups }),
        queryFn: async ({ signal }) => {
            const baseRollupParams = params ? (omit(params, [***REMOVED***order***REMOVED***]) as IPostgrestParams) : undefined

            const rollupResults = await Promise.all(
                (rollups ?? []).map((rollup) =>
                    fetchPredicateRollup({
                        rollup,
                        params: {
                            ...baseRollupParams,
                            ...(targetedParams?.[rollup]
                                ? (omit(targetedParams[rollup], [***REMOVED***order***REMOVED***]) as IPostgrestParams)
                                : {}),
                        },
                        token,
                        signal,
                    })
                )
            )

            const items = await fetchPredicates({
                params: {
                    ...params,
                    limit: 200,
                    ...targetedParams?.predicate,
                },
                token,
                signal,
            })

            return {
                rollups: Object.fromEntries(
                    (rollups ?? []).map((rollup, index) => [rollup, rollupResults[index] as IRollup[]])
                ),
                items,
            }
        },
    })
}

export const usePredicateListWithRollups = ({
    params,
    targetedParams,
    rollups,
}: {
    params?: IPostgrestParams
    targetedParams?: Record<string, IPostgrestParams>
    rollups?: string[]
}) => {
    const auth = useAuth()
    const queryResult = useQuery({
        ...getPredicateListWithRollupsQuery({
            params,
            targetedParams,
            rollups,
            token: auth.user?.access_token,
        }),
        placeholderData: keepPreviousData,
    })

    return queryResult
}
