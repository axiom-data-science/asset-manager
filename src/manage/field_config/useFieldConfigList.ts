import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchemaRollup, fetchObjectSchemas } from "@/manage/object_schema/services"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFieldConfigs } from "./services"

export const fieldConfigListQueryKey = ({params, rollups}: {params?: IPostgrestParams, rollups?: string[]}) => [***REMOVED***field_config-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const getFieldConfigListQuery = ({params, token}: {params?: IPostgrestParams, token: string}) => {
    return queryOptions({
        queryKey: fieldConfigListQueryKey({params}),
        queryFn: async ({ signal }) => {
            const items = await fetchFieldConfigs({
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



export const getFieldConfigListWithRollupsQuery = ({params, rollups, token}: {params?: IPostgrestParams, rollups?: string[], token: string}) => {
    return queryOptions({
        queryKey: fieldConfigListQueryKey({params, rollups}),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchObjectSchemaRollup({
                rollup,
                params,
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchObjectSchemas({
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

export const getFieldConfigListAtFormQuery = ({form_uuid, token}: {form_uuid: string, token: string}) => {
    const params:IPostgrestParams = {
        filters: [
            {
                column: ***REMOVED***form_uuid***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
                value: form_uuid
            }
        ]
    }
    return queryOptions({
        queryKey: fieldConfigListQueryKey({params}),

        queryFn: async ({ signal }) => {


            const items = await fetchFieldConfigs({
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




export const useFieldConfigListWithRollups = ({params, rollups}: {params?: IPostgrestParams, rollups?: string[]}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListWithRollupsQuery({params, rollups, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))

    return queryResult
}

export const useFieldConfigList = ({params}: {params?: IPostgrestParams}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListQuery({params, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}

export const useFieldConfigListAtForm = ({form_uuid, params}: {form_uuid: string, params?: IPostgrestParams}) => {
    const auth = useAuth()
    const combinedParams: IPostgrestParams = {
        ...params,
        filters: [
            {
                column: ***REMOVED***form_uuid***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
                value: form_uuid
            }
        ]
    }
    const queryResult = useQuery(getFieldConfigListQuery({params: combinedParams, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}
