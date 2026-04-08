import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchFieldOverrideConfig } from "./services"

export const fieldConfigQueryKey = ({uuid}: {uuid?: string}) => [***REMOVED***object_schema***REMOVED***, uuid]
export const getFieldConfigQuery = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: fieldConfigQueryKey({uuid}),
        enabled: !!uuid && !!token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            const fieldConfig = await fetchFieldOverrideConfig({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
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
