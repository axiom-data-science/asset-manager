import { useAuth } from "@/auth/useAuth"
import { fetchObjectCategories } from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => ['object_type', uuid]

export const getObjectCategoriesQuery = ({ token }: { token?: string }) => {
    return queryOptions({
        queryKey: ['object_categories'],
        queryFn: async ({ signal }) => {

            const objecType = await fetchObjectCategories({
                signal,
                token: token ?? ''
            })

            return objecType

        }
    })
}

export const useObjectCategories = () => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectCategoriesQuery({ token: auth.user?.access_token ?? '' }))
    return queryResult
}

