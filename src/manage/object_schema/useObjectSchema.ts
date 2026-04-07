import { useAuth } from "@/auth/useAuth"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
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

export const useObjectSchema = ({uuid}: {uuid?: string} = {}) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectSchemaQueryOptions({uuid, token: auth.user?.access_token}))

    return queryResult
}

export const useObjectSchemaFull = ({uuid}: {uuid?: string} = {}) => {
    const auth = useAuth();
    return useCombinedQueries({
        object_schema: getObjectSchemaQueryOptions({uuid, token: auth.user?.access_token}),
        object_types: getObjectTypeListQuery({token: auth.user?.access_token})
    })

    
}
