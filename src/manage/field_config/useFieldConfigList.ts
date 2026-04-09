import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchemaRollup, fetchObjectSchemas } from "@/manage/object_schema/services"
import {  postgrestArgs, postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFieldConfigs, fetchFieldConfigsAtForm, fetchFieldConfigsAtObjectType } from "./services"

export const fieldConfigListQueryKey = ({params, rollups}: {params?: IPostgrestParams, rollups?: string[]}) => [***REMOVED***field_config-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))
export const fieldConfigAtFormListQueryKey = ({params, form_uuid}: {params?: IPostgrestParams, form_uuid: string, rollups?: string[]}) => [***REMOVED***field_config-list***REMOVED***, ***REMOVED***form***REMOVED***, form_uuid, postgrestArgs(params ?? {})]
export const fieldConfigAtObjectTypeListQueryKey = ({params, object_type_uuid}: {params?: IPostgrestParams, object_type_uuid: string}) => [***REMOVED***field_config-list***REMOVED***, ***REMOVED***object_type***REMOVED***, object_type_uuid, postgrestArgs(params ?? {})]


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

export const getFieldConfigListAtFormQuery = ({form_uuid, params, token}: {form_uuid: string, params?: IPostgrestParams, token: string}) => {
    return queryOptions({
        queryKey: fieldConfigAtFormListQueryKey({params, form_uuid}),
        queryFn: async ({ signal }) => {
            const items = await fetchFieldConfigsAtForm({
                form_uuid,
                params,
                token: token ?? ***REMOVED******REMOVED***,
                signal
            });
            return items;
        }
    })
}

export const getFieldConfigListAtObjectTypeQuery = ({object_type_uuid, params, token}: {object_type_uuid: string, params?: IPostgrestParams, token: string}) => {

    return queryOptions({
        queryKey: fieldConfigAtObjectTypeListQueryKey({params, object_type_uuid}),

        queryFn: async ({ signal }) => {
            const items = await fetchFieldConfigsAtObjectType({
                object_type_uuid,
                params,
                token: token ?? ***REMOVED******REMOVED***,
                signal
            });
            return items;
        }
    })
}

export const useFieldConfigListWithRollups = ({params = {}, rollups}: {params?: IPostgrestParams, rollups?: string[]} = {}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListWithRollupsQuery({params, rollups, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))

    return queryResult
}

export const useFieldConfigList = ({params = {}}: {params?: IPostgrestParams} = {}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListQuery({params, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}

export const useFieldConfigListAtForm = ({form_uuid, params}: {form_uuid: string, params?: IPostgrestParams}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListAtFormQuery({form_uuid, params, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}

export const useFieldConfigListAtObjectType = ({object_type_uuid, params}: {object_type_uuid: string, params?: IPostgrestParams}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigListAtObjectTypeQuery({object_type_uuid, params, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}))
    return queryResult
}
