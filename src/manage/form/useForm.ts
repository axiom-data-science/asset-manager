import { useAuth } from "@/auth/useAuth"
import { useQuery } from "@tanstack/react-query"
import { fetchForm } from "./services"

export const formQueryKey = (uuid?: string) => ['form', uuid]

export const useForm = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: formQueryKey(uuid),
        enabled: !!uuid && !!auth.user?.access_token && uuid !== '',
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchForm({
                uuid: uuid ?? 'NA',
                signal,
                token: auth.user?.access_token ?? ''
            })

            return objectSchema
            
        }
    })

    return queryResult
}
