import { useAuth } from "@/auth/useAuth"
import {  postgrestRollupArgs } from "@/services/postgrest/endpoints"
import type {  IPostgrestParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"
import { fetchFormRollup, fetchForms } from "./services"

export const formListQueryKey = (params?: IPostgrestParams, rollups?: string[]) => ['form-list'].concat((rollups ?? []).map(r => postgrestRollupArgs({rollupColumn: r, params}).toString()))

export const useFormList = (params?: IPostgrestParams, rollups?: string[]) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: formListQueryKey(params, rollups),
        queryFn: async ({ signal }) => {

            const rollupResults = await Promise.all((rollups ?? []).map(rollup => fetchFormRollup({
                rollup,
                params,
                token: auth.user?.access_token || '',
                signal
            })))


            const items = await fetchForms({
                params: {
                    ...params,
                    limit: 100
                },
                token: auth.user?.access_token || '',
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
