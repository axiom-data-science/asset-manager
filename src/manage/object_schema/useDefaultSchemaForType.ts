import { useAuth } from "@/auth/useAuth"
import { fetchDefaultObjectTypeSchemaAtSlug, fetchDefaultObjectTypeSchemaAtUUID } from "@/manage/object_schema/services"
import { useQuery } from "@tanstack/react-query"

export const objectSchemaQueryKey = (uuid?: string) => [***REMOVED***object_schema***REMOVED***, uuid]

export const useDefaultObjectSchemaAtUUID = (object_type_uuid: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectSchemaQueryKey(object_type_uuid),
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchDefaultObjectTypeSchemaAtUUID({
                object_type_uuid: object_type_uuid,
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })

    return queryResult
}

export const useDefaultObjectSchemaAtSlug = (object_type_slug: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectSchemaQueryKey(object_type_slug),
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchDefaultObjectTypeSchemaAtSlug({
                object_type_slug: object_type_slug,
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })

    return queryResult
}
