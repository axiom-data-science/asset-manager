import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchPredicates } from ***REMOVED***@/manage/document/services***REMOVED***
import { fetchDocuments } from ***REMOVED***@/manage/document/services***REMOVED***
import { fetchRelationshipRollup, fetchRelationships } from ***REMOVED***@/manage/relationship/services***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { keepPreviousData, queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

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
    [***REMOVED***relationship***REMOVED***, ***REMOVED***relationship-list***REMOVED***].concat(
        (rollups ?? []).map((r) =>
            postgrestRollupArgs({
                rollupColumn: r,
                params: params ? (omit(params, [***REMOVED***order***REMOVED***]) as IPostgrestParams) : undefined,
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
            const baseRollupParams = params ? (omit(params, [***REMOVED***order***REMOVED***]) as IPostgrestParams) : undefined
            const rollupResults = await Promise.all(
                (rollups ?? []).map((rollup) =>
                    fetchRelationshipRollup({
                        rollup,
                        params: {
                            ...baseRollupParams,
                            ...(targetedParams?.[rollup]
                                ? (omit(targetedParams[rollup], [***REMOVED***order***REMOVED***]) as IPostgrestParams)
                                : {}),
                        },
                        token: token ?? ***REMOVED******REMOVED***,
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
                    token: token ?? ***REMOVED******REMOVED***,
                    signal,
                }),
                fetchDocuments({
                    params: {
                        select: [***REMOVED***uuid***REMOVED***, ***REMOVED***label***REMOVED***],
                        order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
                        limit: 500,
                    },
                    token: token ?? ***REMOVED******REMOVED***,
                    signal,
                }).then((list) => list.map((d) => ({ uuid: d.uuid, label: d.label }) as ISimpleDocument)),
                fetchPredicates({
                    params: {
                        order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
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
