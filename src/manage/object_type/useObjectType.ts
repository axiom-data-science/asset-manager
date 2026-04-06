import { useAuth } from "@/auth/useAuth"
import { fetchObjectType} from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => ['object_type', uuid]
export const objectTypeFormsQueryKey = (object_type_uuid?: string) => ['object_type', 'forms', object_type_uuid]


export const getObjectTypeQuery = (uuid?: string, token?: string) => {
    return  queryOptions({
        queryKey: objectTypeQueryKey(uuid),
        enabled: !!uuid && !!token && uuid !== '',
        queryFn: async ({ signal }) => {
            
            const objectType = await fetchObjectType({
                uuid: uuid ?? 'NA',
                signal,
                token: token ?? ''
            })

            return objectType
            
        }
    })
}

export const useObjectType = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectTypeQuery(uuid, auth.user?.access_token))

    return queryResult
}
