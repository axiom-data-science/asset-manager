import { useAuth } from "@/auth/useAuth"
import { fetchObjectCategories } from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => [***REMOVED***object_type***REMOVED***, uuid]

export const getObjectCategoriesQuery = ({ token }: { token?: string }) => {
    return queryOptions({
        queryKey: [***REMOVED***object_categories***REMOVED***],
        queryFn: async ({ signal }) => {

            const objecType = await fetchObjectCategories({
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })

            return objecType

        }
    })
}

export const useObjectCategories = () => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectCategoriesQuery({ token: auth.user?.access_token ?? ***REMOVED******REMOVED*** }))
    return queryResult
}

