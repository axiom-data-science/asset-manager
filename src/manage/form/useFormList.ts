import { useAuth } from "@/auth/useAuth"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFormRollup, fetchForms } from "./services"

export const formListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => [***REMOVED***form-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const getFormListWithRollupsQueryOptions = ({params, rollups, token}: {params?: IPostgrestParams, rollups?: string[], token?: string}) => {
    return queryOptions({
        queryKey: formListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

             const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchFormRollup({
                rollup,
                params,
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchForms({
                params: {
                    ...params,
                    limit: 100
                },
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })

            return {
                rollups: Object.fromEntries((rollups ?? []).map((rollup, index) => [rollup, rollupResults[index]])),
                items
            }
        }
    })

}

export const getFormListQueryOptions = ({params, rollups, token}: {params?: IPostgrestParams, rollups?: string[], token?: string}) => {
    return queryOptions({
        queryKey: formListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const items = await fetchForms({
                params: {
                    ...params,
                    limit: 100
                },
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })

            return items
            
        }
    })
}

export const getFormListForObjectTypeQueryOptions = ({params, object_type_uuid, token}: {params?: IPostgrestParams, object_type_uuid?: string, token?: string}) => {
    const combinedParams: IPostgrestParams = {
        ...params,
        filters: [
            {
                column: ***REMOVED***object_type_uuid***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
                value: object_type_uuid ?? ***REMOVED******REMOVED***
            }
        ]
    }
    return getFormListQueryOptions({params: combinedParams, token})
}

export const useFormList = (params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormListQueryOptions({params, rollups, token: auth.user?.access_token}))
    return queryResult
}

export const useFormListWithRollups = (params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormListQueryOptions({params, rollups, token: auth.user?.access_token}))
    return queryResult
}
