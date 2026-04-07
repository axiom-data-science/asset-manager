import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchemaRollup, fetchObjectSchemas } from "@/manage/object_schema/services"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"

export const objectSchemaListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => [***REMOVED***object_schema-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const getObjectSchemaListWithRollupsQueryOptions = ({params, rollups, token}: {params?: IPostgrestParams, rollups?: string[], token?: string}) => {
    return queryOptions({
        queryKey: objectSchemaListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchObjectSchemaRollup({
                rollup,
                params,
                token:token ?? ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchObjectSchemas({
                params: {
                    ...params,
                    limit: 100
                },
                token:token ?? ***REMOVED******REMOVED***,
                signal
            })

            return {
                rollups: Object.fromEntries((rollups ?? []).map((rollup, index) => [rollup, rollupResults[index]])),
                items
            }
            
        }
    })
}

export const getObjectSchemaListQueryOptions = ({params, token}: {params?: IPostgrestParams, token?: string}) => {
    return queryOptions({
        queryKey: objectSchemaListQueryKey(params),
        queryFn: async ({ signal }) => {


            const items = await fetchObjectSchemas({
                params: {
                    ...params,
                    limit: 100
                },
                token:token ?? ***REMOVED******REMOVED***,
                signal
            })

           return items
            
        }
    })
}

export const useObjectSchemaListWithRollups = ({params, rollups}: {params?: IPostgrestParams, rollups?: string[]}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectSchemaListWithRollupsQueryOptions({params, rollups, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}

export const useObjectSchemaList = ({params}: {params?: IPostgrestParams}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectSchemaListQueryOptions({params, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}