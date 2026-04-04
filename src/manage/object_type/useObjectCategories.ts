import { useAuth } from "@/auth/useAuth"
import { fetchObjectCategories} from "@/manage/object_type/services"

import { useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => ['object_type', uuid]

export const useObjectCategories = () => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: ['object_categories'],
        queryFn: async ({ signal }) => {
            
            const objecType = await fetchObjectCategories({
                signal,
                token: auth.user?.access_token ?? ''
            })

            return objecType
            
        }
    })

    return queryResult
}
