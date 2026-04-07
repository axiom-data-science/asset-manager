import { useAuth } from "@/auth/useAuth"
import { getFormListForObjectTypeQueryOptions } from "@/manage/form/useFormList"
import { fetchObjectType} from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectSchemaListQueryOptions } from "@/manage/object_schema/useObjectSchemaList"

export const objectTypeQueryKey = (uuid?: string) => [***REMOVED***object_type***REMOVED***, uuid]
export const objectTypeFormsQueryKey = (object_type_uuid?: string) => [***REMOVED***object_type***REMOVED***, ***REMOVED***forms***REMOVED***, object_type_uuid]


export const getObjectTypeQuery = (uuid?: string, token?: string) => {
    return  queryOptions({
        queryKey: objectTypeQueryKey(uuid),
        enabled: !!uuid && !!token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectType = await fetchObjectType({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
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
        object_type: getObjectTypeQuery(uuid ?? ***REMOVED******REMOVED***, auth.user?.access_token ?? ***REMOVED******REMOVED***),
        schemas: getObjectSchemaListQueryOptions({
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            params:{
                filters: [
                    {
                        column:***REMOVED***object_type_uuid***REMOVED***,
                        operator: ***REMOVED***eq***REMOVED***,
                        value: uuid ?? ***REMOVED******REMOVED***
                    }
                ]
            }
        }),
        forms: getFormListForObjectTypeQueryOptions({object_type_uuid: uuid ?? ***REMOVED******REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***})
    })
}