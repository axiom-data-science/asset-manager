import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchDefaultFormAtObjectType, fetchForm } from "./services"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectTypeListQuery } from "@/manage/object_type/useObjectTypeList"
import { getFieldConfigListAtFormQuery } from "../field_config/useFieldConfigList"

export const formQueryKey = (uuid?: string) => [***REMOVED***form***REMOVED***, uuid]
export const formWithLookupsQueryKey = (uuid?: string) => [***REMOVED***form***REMOVED***, ***REMOVED***object-types***REMOVED***, uuid]
export const formAtObjectTypeQueryKey = ({object_type_uuid}: {object_type_uuid?: string}) => [***REMOVED***form***REMOVED***, ***REMOVED***object_type***REMOVED***, object_type_uuid]

export const getFormQuery = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: formQueryKey(uuid),
        enabled: !!uuid && !!token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchForm({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })

            return objectSchema
            
        }
    })
}

export const getFormAtObjectTypeQuery = ({object_type_uuid, token}: {object_type_uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: formAtObjectTypeQueryKey({object_type_uuid}),
        enabled: !!object_type_uuid && !!token && object_type_uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            const form = await fetchDefaultFormAtObjectType({
                object_type_uuid: object_type_uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })

            return form
        }
    })

}

export const useForm = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormQuery({ uuid, token: auth.user?.access_token }))
    return queryResult
}

export const  useFormWithLookups = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    const queryObjects = {
        form: getFormQuery({uuid, token: useAuth().user?.access_token}),
        object_types: getObjectTypeListQuery({token: auth.user?.access_token}),
        field_configs: getFieldConfigListAtFormQuery({form_uuid: uuid ?? ***REMOVED***NA***REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***})
    }   

    return useCombinedQueries(queryObjects)
}

export const useDefaultFormAtObjectType = ({ object_type_uuid }: { object_type_uuid?: string }) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormAtObjectTypeQuery({ object_type_uuid, token: auth.user?.access_token }))
    return queryResult
}
