import { useAuth } from '@/auth/useAuth'
import { fetchPredicates } from '@/manage/document/services'
import { fetchDocuments } from '@/manage/document/services'
import { fetchRelationshipRollup, fetchRelationships } from '@/manage/relationship/services'
import { postgrestRollupArgs } from '@/services/postgrest/endpoints'
import type { IPostgrestParams, IRollup } from '@/types/types'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { omit } from 'lodash-es'

type ISimpleDocument = {
    uuid: string
    label: string
}

type ISimplePredicate = {
    uuid: string
    label: string
    predicate: string
}

export const relationshipListQueryKey = ({
    params,
    rollups,
}: {
    params?: IPostgrestParams
    rollups?: string[]
}) =>
    ['relationship', 'relationship-list'].concat(
        (rollups ?? []).map((r) =>
            postgrestRollupArgs({
                rollupColumn: r,
                params: params ? (omit(params, ['order']) as IPostgrestParams) : undefined,
            }).toString()
        )
    )

export const getRelationshipListWithRollupsAndLookupsQuery = ({
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
        queryKey: relationshipListQueryKey({ params, rollups }),
        queryFn: async ({ signal }) => {
            const baseRollupParams = params ? (omit(params, ['order']) as IPostgrestParams) : undefined
            const rollupResults = await Promise.all(
                (rollups ?? []).map((rollup) =>
                    fetchRelationshipRollup({
                        rollup,
                        params: {
                            ...baseRollupParams,
                            ...(targetedParams?.[rollup]
                                ? (omit(targetedParams[rollup], ['order']) as IPostgrestParams)
                                : {}),
                        },
                        token: token ?? '',
                        signal,
                    })
                )
            )

            const [items, documents, predicates] = await Promise.all([
                fetchRelationships({
                    params: {
                        ...params,
                        limit: 200,
                        ...targetedParams?.relationship,
                    },
                    token: token ?? '',
                    signal,
                }),
                fetchDocuments({
                    params: {
                        select: ['uuid', 'label'],
                        order: [{ column: 'label', dir: 'asc' }],
                        limit: 500,
                    },
                    token: token ?? '',
                    signal,
                }).then((list) => list.map((d) => ({ uuid: d.uuid, label: d.label }) as ISimpleDocument)),
                fetchPredicates({
                    params: {
                        order: [{ column: 'label', dir: 'asc' }],
                        limit: 500,
                    },
                    signal,
                }).then((list) =>
                    list.map((p) => ({ uuid: p.uuid, label: p.label, predicate: p.predicate }) as ISimplePredicate)
                ),
            ])

            return {
                relationships: {
                    rollups: Object.fromEntries(
                        (rollups ?? []).map((rollup, index) => [rollup, rollupResults[index] as IRollup[]])
                    ),
                    items,
                },
                documents,
                predicates,
            }
        },
    })
}

export const useRelationshipListWithRollupsAndLookups = ({
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
        ...getRelationshipListWithRollupsAndLookupsQuery({
            params,
            targetedParams,
            rollups,
            token: auth.user?.access_token,
        }),
        placeholderData: keepPreviousData,
    })
    return queryResult
}

export type RelationshipListWithLookups = ReturnType<
    typeof getRelationshipListWithRollupsAndLookupsQuery
>
