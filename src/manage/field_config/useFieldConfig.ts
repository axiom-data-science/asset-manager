import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFieldOverrideConfig } from "./services"

export const fieldConfigQueryKey = ({uuid}: {uuid?: string}) => ['object_schema', uuid]
export const getFieldConfigQuery = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: fieldConfigQueryKey({uuid}),
        enabled: !!uuid && !!token && uuid !== '',
        queryFn: async ({ signal }) => {
            const fieldConfig = await fetchFieldOverrideConfig({
                uuid: uuid ?? 'NA',
                signal,
                token: token ?? ''
            })
            return fieldConfig
        }
    })
}

export const useFieldConfig = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigQuery({uuid, token: auth.user?.access_token}))

    return queryResult
}
