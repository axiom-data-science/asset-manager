import { useAuth } from "@/auth/useAuth"
import { getFormListForObjectTypeQueryOptions } from "@/manage/form/useFormList"
import { fetchObjectType } from "@/manage/object_type/services"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectSchemaListQueryOptions } from "@/manage/object_schema/useObjectSchemaList"
import { fetchSingleFromPostgrest } from "@/services/postgrest/services"
import type { JSONSchema6 } from "json-schema"
import { getObjectCategoriesQuery } from "@/manage/object_type/useObjectCategories"

export const objectTypeQueryKey = (uuid?: string) => ['object_type', uuid]
export const objectTypeFormsQueryKey = (object_type_uuid?: string) => ['object_type', 'forms', object_type_uuid]


export const getObjectTypeQuery = (uuid?: string, token?: string) => {
    return queryOptions({
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

export const getObjectSchemaQuery = ({ token }: { token?: string }) => {
    return queryOptions({
        queryKey: ['object_type', 'schema'],
        queryFn: async ({ signal }) => {
            const schema = await fetchSingleFromPostgrest<JSONSchema6>({
                table: 'rpc/object_type_data_schema',
                token: token ?? '',
                signal
            })
            return schema
        }
    })
}

export const useObjectType = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery(getObjectTypeQuery(uuid, auth.user?.access_token))

    return queryResult
}

export const useObjectTypeFull = ({ uuid }: { uuid?: string }) => {
    const auth = useAuth();
    return useCombinedQueries({
        object_type: getObjectTypeQuery(uuid ?? '', auth.user?.access_token ?? ''),
        schemas: getObjectSchemaListQueryOptions({
            token: auth.user?.access_token ?? '',
            params: {
                filters: [
                    {
                        column: 'object_type_uuid',
                        operator: 'eq',
                        value: uuid ?? ''
                    }
                ]
            }
        }),
        forms: getFormListForObjectTypeQueryOptions({ object_type_uuid: uuid ?? '', token: auth.user?.access_token ?? '' })
    })
}

export const useObjectTypeSchema = () => {
    const auth = useAuth()
    return useQuery(getObjectSchemaQuery({ token: auth.user?.access_token ?? '' }))
}


export const useObjectTypeSchemaAndObjectCategories = () => {
    return useCombinedQueries({
        schema: getObjectSchemaQuery({ token: useAuth().user?.access_token ?? '' }),
        object_categories: getObjectCategoriesQuery({ token: useAuth().user?.access_token ?? '' })
    })
}