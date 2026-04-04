import { useAuth } from "@/auth/useAuth"
import { fetchObjectCategories} from "@/manage/object_type/services"

import { useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => [***REMOVED***object_type***REMOVED***, uuid]

export const useObjectCategories = () => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: [***REMOVED***object_categories***REMOVED***],
        queryFn: async ({ signal }) => {
            
            const objecType = await fetchObjectCategories({
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objecType
            
        }
    })

    return queryResult
}
