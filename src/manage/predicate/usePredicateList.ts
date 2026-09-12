import { useAuth } from '@/auth/useAuth'
import { fetchPredicateRollup, fetchPredicates } from '@/manage/predicate/services'
import { postgrestRollupArgs } from '@/services/postgrest/endpoints'
import type { IPostgrestParams, IRollup } from '@/types/types'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { omit } from 'lodash-es'

export const predicateListQueryKey = ({
    params,
    rollups,
}: {
    params?: IPostgrestParams
    rollups?: string[]
}) =>
    ['predicate', 'predicate-list'].concat(
        (rollups ?? []).map((r) =>
            postgrestRollupArgs({
                rollupColumn: r,
                params: params ? (omit(params, ['order']) as IPostgrestParams) : undefined,
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
            const baseRollupParams = params ? (omit(params, ['order']) as IPostgrestParams) : undefined

            const rollupResults = await Promise.all(
                (rollups ?? []).map((rollup) =>
                    fetchPredicateRollup({
                        rollup,
                        params: {
                            ...baseRollupParams,
                            ...(targetedParams?.[rollup]
                                ? (omit(targetedParams[rollup], ['order']) as IPostgrestParams)
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
