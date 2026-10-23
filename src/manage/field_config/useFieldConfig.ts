import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFieldConfigFormLinks, fetchFieldOverrideConfig } from "./services"

export const fieldConfigQueryKey = ({uuid}: {uuid?: string}) => ['field_config', uuid]
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

export const getFieldConfigFormLinksQuery = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: ['field_config', uuid, 'forms'],
        enabled: !!uuid && !!token && uuid !== '',
        queryFn: async ({ signal }) => fetchFieldConfigFormLinks({
            fields_override_config_uuid: uuid ?? '',
            token: token ?? '',
            signal
        })
    })
}

export const useFieldConfig = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    const queryResult = useQuery(getFieldConfigQuery({uuid, token: auth.user?.access_token}))

    return queryResult
}

export const useFieldConfigFormLinks = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    return useQuery(getFieldConfigFormLinksQuery({uuid, token: auth.user?.access_token}))
}
