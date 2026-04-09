import { useAuth } from "@/auth/useAuth"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { fetchFormsAtSchema } from "@/manage/form/services"
import { fetchObjectSchema } from "@/manage/object_schema/services"
import { getObjectTypeListQuery } from "@/manage/object_type/useObjectTypeList"
import { queryOptions, useQuery } from "@tanstack/react-query"

export const objectSchemaQueryKey = (uuid?: string) => [***REMOVED***object_schema***REMOVED***, uuid]
export const getObjectSchemaQueryOptions = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: objectSchemaQueryKey(uuid),
        enabled: !!uuid && token !== undefined && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchObjectSchema({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })

}

export const getFormsAtSchemaQueryOptions = ({object_schema_uuid, token}: {object_schema_uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: [***REMOVED***object_schema***REMOVED***, ***REMOVED***forms***REMOVED***, object_schema_uuid],
        enabled: !!object_schema_uuid && token !== undefined && object_schema_uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            const forms = await fetchFormsAtSchema({
                object_schema_uuid: object_schema_uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })
            return forms
        }
    })
}

export const useObjectSchema = ({uuid}: {uuid?: string} = {}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectSchemaQueryOptions({uuid, token: auth.user?.access_token}))

    return queryResult
}

export const useObjectSchemaFull = ({uuid}: {uuid?: string} = {}) => {
    const auth = useAuth();
    return useCombinedQueries({
        object_schema: getObjectSchemaQueryOptions({uuid, token: auth.user?.access_token}),
        object_types: getObjectTypeListQuery({token: auth.user?.access_token}),
        forms: getFormsAtSchemaQueryOptions({object_schema_uuid: uuid, token: auth.user?.access_token})
    })
}
