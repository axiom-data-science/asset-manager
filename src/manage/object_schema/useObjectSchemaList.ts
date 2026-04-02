import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchemaRollup, fetchObjectSchemas } from "@/manage/object_schema/services"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const objectSchemaListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => [***REMOVED***object_schema-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const useObjectSchemaList = (params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectSchemaListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchObjectSchemaRollup({
                rollup,
                params,
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchObjectSchemas({
                params: {
                    ...params,
                    limit: 100
                },
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })

            return {
                rollups: Object.fromEntries((rollups ?? []).map((rollup, index) => [rollup, rollupResults[index]])),
                items
            }
            
        }
    })

    return queryResult
}
