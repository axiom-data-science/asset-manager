import { useAuth } from "@/auth/useAuth"
import { fetchObjectTypeRollup, fetchObjectTypes } from "@/manage/object_type/services"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { getFormListQueryOptions } from "../form/useFormList"
import { getObjectSchemaListQueryOptions } from "../object_schema/useObjectSchemaList"
import { useCombinedQueries } from "@/hooks/use-combined-queries"

export const objectTypeListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => [***REMOVED***object_type-list***REMOVED***].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const getObjectTypeListWithRollupsQuery = ({params, rollups, token}: {params?: IPostgrestParams, rollups?: string[], token?: string}) => {
    return queryOptions({
        queryKey: objectTypeListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchObjectTypeRollup({
                rollup,
                params,
                token: token ?? ***REMOVED******REMOVED***,
                signal
            })))


            const items = await fetchObjectTypes({
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

export const getObjectTypeListQuery = ({params, token}: {params?: IPostgrestParams, token?: string}) => {
    return queryOptions({
        queryKey: objectTypeListQueryKey(params),
        queryFn: async ({ signal }) => {

            const items = await fetchObjectTypes({
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




export const useObjectTypeListWithRollups = ({params, rollups}: {params?: IPostgrestParams, rollups?: string[]}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectTypeListWithRollupsQuery({params, rollups, token: auth.user?.access_token}))

    return queryResult
}

export const useObjectTypeList = ({params}: {params?: IPostgrestParams} = {}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectTypeListQuery({params, token: auth.user?.access_token}))
    return queryResult
}


export const useObjectTypeListAtCategory = ({category}: {category?: string} = {category: ***REMOVED***document***REMOVED***}) => {
    return useObjectTypeList({params: { filters: category !== undefined  ? [
        {
            column: ***REMOVED***category***REMOVED***,
            operator: ***REMOVED***eq***REMOVED***,
            value: category
        }
    ] : undefined}})
}


export const useObjectTypesAndFormsAndSchemas = ({params}: {params?: IPostgrestParams} = {}) => {
    const auth = useAuth()
    const queryObject = {
        object_types: getObjectTypeListQuery({params, token: auth.user?.access_token}),
        forms: getFormListQueryOptions({params, token: auth.user?.access_token}),
        schemas: getObjectSchemaListQueryOptions({params, token: auth.user?.access_token})
    }
    return useCombinedQueries(queryObject)
}
