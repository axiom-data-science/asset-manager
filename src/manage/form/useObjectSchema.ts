import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchema } from "@/manage/object_schema/services"
import { useQuery } from "@tanstack/react-query"

export const objectSchemaQueryKey = (uuid?: string) => [***REMOVED***object_schema***REMOVED***, uuid]

export const useObjectSchema = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectSchemaQueryKey(uuid),
        enabled: !!uuid && !!auth.user?.access_token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchObjectSchema({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })

    return queryResult
}
