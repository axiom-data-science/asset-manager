import { useAuth } from "@/auth/useAuth"
import { useQuery } from "@tanstack/react-query"
import { fetchForm } from "./services"

export const formQueryKey = (uuid?: string) => [***REMOVED***form***REMOVED***, uuid]

export const useForm = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: formQueryKey(uuid),
        enabled: !!uuid && !!auth.user?.access_token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchForm({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })

    return queryResult
}
