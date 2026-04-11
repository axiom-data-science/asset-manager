import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchDefaultFormAtObjectType, fetchForm } from "./services"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectTypeListQuery } from "@/manage/object_type/useObjectTypeList"
import { getFieldConfigListAtFormQuery } from "../field_config/useFieldConfigList"
import { fetchSchemaAtForm } from "@/manage/object_schema/services"
import { postgrestArgs } from "@/services/postgrest/endpoints"
import type { IPostgrestParams } from "@/types/types"
import { getObjectSchemaAndObjectTypeQuery } from "../object_schema/useObjectSchema"

export const formQueryKey = (uuid?: string, params?: IPostgrestParams) => [***REMOVED***form***REMOVED***, uuid, postgrestArgs(params ?? {}).toString()]
export const formWithLookupsQueryKey = (uuid?: string) => [***REMOVED***form***REMOVED***, ***REMOVED***object-types***REMOVED***, uuid]
export const formAtObjectTypeQueryKey = ({object_type_uuid}: {object_type_uuid?: string}) => [***REMOVED***form***REMOVED***, ***REMOVED***object_type***REMOVED***, object_type_uuid]
export const fullFormAtObjectTypeQueryKey = ({object_type_uuid}: {object_type_uuid?: string}) => [***REMOVED***form***REMOVED***, ***REMOVED***object_type***REMOVED***, object_type_uuid, ***REMOVED***full***REMOVED***]

export const getFormQuery = ({uuid, token, params}: {uuid?: string, token?: string, params?: IPostgrestParams}) => {
    return queryOptions({
        queryKey: formQueryKey(uuid,params),
        enabled: !!uuid && !!token && uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchForm({
                uuid: uuid ?? ***REMOVED***NA***REMOVED***,
                signal,
                token: token ?? ***REMOVED******REMOVED***,
                params
            })

            return objectSchema
            
        }
    })
}

export const getFormAtObjectTypeQuery = ({object_type_uuid, params, token}: {object_type_uuid?: string, params?: IPostgrestParams, token?: string}) => {
    return queryOptions({
        queryKey: formAtObjectTypeQueryKey({object_type_uuid}),
        enabled: !!object_type_uuid && !!token && object_type_uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            const form = await fetchDefaultFormAtObjectType({
                object_type_uuid: object_type_uuid ?? ***REMOVED***NA***REMOVED***,
                params,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })

            return form
        }
    })

}

export const getSchemaAtFormQuery = ({form_uuid, params, token}: {form_uuid?: string, params?: IPostgrestParams, token?: string}) => {
    return queryOptions({
        queryKey: [***REMOVED***form***REMOVED***, ***REMOVED***object_schema***REMOVED***, form_uuid, postgrestArgs(params ?? {}).toString()],
        enabled: !!form_uuid && !!token && form_uuid !== ***REMOVED******REMOVED***,
        queryFn: async ({ signal }) => {
            const objectSchema = await fetchSchemaAtForm({
                form_uuid: form_uuid ?? ***REMOVED***NA***REMOVED***,
                params,
                signal,
                token: token ?? ***REMOVED******REMOVED***
            })
            return objectSchema
        }
    })
}

export const useForm = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormQuery({ uuid, token: auth.user?.access_token }))
    return queryResult
}

export const useFullForm = ({form_uuid}: {form_uuid?: string}) => {
    const auth = useAuth()
    const form = useQuery(getFormQuery({uuid: form_uuid, token: auth.user?.access_token, params: {
        select: [***REMOVED***object_type_uuid***REMOVED***]
    }}))
    const queryObjects = {
        form: getFormQuery({uuid: form_uuid, token: auth.user?.access_token}),
        field_configs: getFieldConfigListAtFormQuery({form_uuid: form_uuid ?? ***REMOVED***NA***REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}),
        object_schema: {
            ...getObjectSchemaAndObjectTypeQuery({object_type_uuid: form.data?.object_type_uuid ?? ***REMOVED***NA***REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}),
            enabled: !!form.data && !!auth.user?.access_token && form.data.object_type_uuid !== ***REMOVED******REMOVED***
        }
    }
    return useCombinedQueries(queryObjects)
}


export const  useFormWithLookups = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    const queryObjects = {
        form: getFormQuery({uuid, token: auth.user?.access_token}),
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



export const useFullDefaultFormAtObjectType = ({ object_type_uuid }: { object_type_uuid?: string }) => {
    const auth = useAuth()
    const form = useQuery(getFormAtObjectTypeQuery({object_type_uuid, token: auth.user?.access_token, params: {
        select: [***REMOVED***uuid***REMOVED***]
    }}))
    const queryObjects = {
        //form: getFormAtObjectTypeQuery({object_type_uuid, token: auth.user?.access_token}),
        form: getFormAtObjectTypeQuery({object_type_uuid, token: auth.user?.access_token}),
        object_types: {
            ...getObjectTypeListQuery({token: auth.user?.access_token}),
            enabled: !!form.data && !!auth.user?.access_token && object_type_uuid !== ***REMOVED******REMOVED***
        },
        field_configs: {
            ...getFieldConfigListAtFormQuery({form_uuid: form?.data?.uuid ?? ***REMOVED***NA***REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}),
            enabled: !!form.data && !!auth.user?.access_token && object_type_uuid !== ***REMOVED******REMOVED***
        },
        object_schema: {
            ...getSchemaAtFormQuery({form_uuid: form?.data?.uuid ?? ***REMOVED***NA***REMOVED***, token: auth.user?.access_token ?? ***REMOVED******REMOVED***}),
            enabled: !!form.data && !!auth.user?.access_token && object_type_uuid !== ***REMOVED******REMOVED***
        }
    }
    
    return useCombinedQueries(queryObjects)
}
