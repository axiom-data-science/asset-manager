import { useAuth } from "@/auth/useAuth"
import { fetchObjectType} from "@/manage/object_type/services"

import { useQuery } from "@tanstack/react-query"

export const objectTypeQueryKey = (uuid?: string) => ['object_type', uuid]
export const objectTypeFormsQueryKey = (object_type_uuid?: string) => ['object_type', 'forms', object_type_uuid]

export const useObjectType = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery({
        queryKey: ['object_type', uuid],
        enabled: !!uuid && !!auth.user?.access_token && uuid !== '',
        queryFn: async ({ signal }) => {
            
            const objecType = await fetchObjectType({
                uuid: uuid ?? 'NA',
                signal,
                token: auth.user?.access_token ?? ''
            })

            return objecType
            
        }
    })

    return queryResult
}
