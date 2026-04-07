import { useAuth } from "@/auth/useAuth"
import { getFormListForObjectTypeQueryOptions } from "@/manage/form/useFormList"
import { fetchObjectType} from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectSchemaListQueryOptions } from "@/manage/object_schema/useObjectSchemaList"

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

export const useObjectTypeFull = ({uuid}: {uuid?: string}) => {
    const auth = useAuth();
    return useCombinedQueries({
        object_type: getObjectTypeQuery(uuid ?? '', auth.user?.access_token ?? ''),
        schemas: getObjectSchemaListQueryOptions({token: auth.user?.access_token ?? ''}),
        forms: getFormListForObjectTypeQueryOptions({object_type_uuid: uuid ?? '', token: auth.user?.access_token ?? ''})
    })
}