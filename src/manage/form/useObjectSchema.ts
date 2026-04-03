import { useAuth } from "@/auth/useAuth"
import { fetchObjectSchema } from "@/manage/object_schema/services"
import { useQuery } from "@tanstack/react-query"

export const objectSchemaQueryKey = (uuid?: string) => ['object_schema', uuid]

export const useObjectSchema = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: objectSchemaQueryKey(uuid),
        enabled: !!uuid && !!auth.user?.access_token && uuid !== '',
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchObjectSchema({
                uuid: uuid ?? 'NA',
                signal,
                token: auth.user?.access_token ?? ''
            })

            return objectSchema
            
        }
    })

    return queryResult
}
