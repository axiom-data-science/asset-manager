import { useAuth } from "@/auth/useAuth"
import { fetchObjectTypeRollup, fetchObjectTypes } from "@/manage/object_type/services"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const objectTypeListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => [***REMOVED***object_type-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))




export const useObjectTypeList = ( params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectTypeListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchObjectTypeRollup({
                rollup,
                params,
                token: auth.user?.access_token || ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchObjectTypes({
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


export const useObjectTypeListAtCategory = (category: string = ***REMOVED***document***REMOVED***) => {
    return useObjectTypeList({ filters: [
        {
            column: ***REMOVED***category***REMOVED***,
            operator: ***REMOVED***eq***REMOVED***,
            value: category
        }
    ]})
}
