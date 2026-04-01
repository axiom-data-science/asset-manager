import { useAuth } from "@/auth/useAuth"
import { fetchObjectType} from "@/manage/object_type/services"

import { useQuery } from "@tanstack/react-query"

export const useObjectType = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: [***REMOVED***object_type***REMOVED***, uuid],
        enabled: !!uuid && !!auth.user?.access_token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objecType = await fetchObjectType({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***
            })

            return objecType
            
        }
    })

    return queryResult
}
