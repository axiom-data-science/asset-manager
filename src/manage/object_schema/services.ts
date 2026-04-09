import { fetchForm } from "@/manage/form/services";
import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IObjectSchema, IPostgrestParams } from "@/types/types";

const OBJECT_SCHEMAS_TABLE = ***REMOVED***object_schema***REMOVED***;

export const fetchObjectSchemas = async({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IObjectSchema[]> => {

    const documents = await fetchListFromPostgrest<IObjectSchema>({
        table: OBJECT_SCHEMAS_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchObjectSchema = async ({
    uuid,
    params,
    token,
    signal
}:{
    uuid: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const document = await fetchSingleFromPostgrest<IObjectSchema>({
        table: OBJECT_SCHEMAS_TABLE,
        uuid,
        params,
        token,
        signal
    })   
    return document;

}

export const fetchDefaultObjectTypeSchemaAtUUID = async ({
    object_type_uuid,
    token,
    signal
}:{
    object_type_uuid: string,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const objectSchema = await fetchSingleFromPostgrest<IObjectSchema>({
        table: `rpc/get_default_schema_at_object_type_uuid?object_type_uuid=${object_type_uuid}`,
        token,
        signal
    });
    return objectSchema;
}

export const fetchDefaultObjectTypeSchemaAtSlug = async ({
    object_type_slug,
    token,
    signal
}:{
    object_type_slug: string,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const objectSchema = await fetchSingleFromPostgrest<IObjectSchema>({
        table: `rpc/get_default_schema_at_object_type_slug?object_type_slug=${object_type_slug}`,
        token,
        signal
    });
    return objectSchema;
}
export const fetchObjectSchemaRollup = async ({
    rollup,
    params, 
    signal,
    token
}: {
    rollup: string 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<{label: string, count: number}[]> => {
    
    const list = await fetchRollupFromPostgrest({
        table: OBJECT_SCHEMAS_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const fetchSchemasForObjectType = async ({
    object_type_uuid,
    token,
    signal
}: {
    object_type_uuid: string,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema[]> => {
    const list = await fetchObjectSchemas({
        params: {
            filters: [
                {
                    column: ***REMOVED***object_type_uuid***REMOVED***,
                    operator: ***REMOVED***eq***REMOVED***,
                    value: object_type_uuid
                }
            ]
        },
        token,
        signal
    })

    return list
        
}

export const fetchSchemaAtForm = async ({
    form_uuid,
    params,
    token,
    signal
}: {
    form_uuid: string,
    token: string,
    params?: IPostgrestParams,
    signal?: AbortSignal
}) => {
    const form = await fetchForm({
        uuid: form_uuid,
        params:{
            select:[***REMOVED***object_type_uuid***REMOVED***, ***REMOVED***object_schema_version***REMOVED***],
        },
        token,
        signal
    })
    const schema = await fetchSingleFromPostgrest<IObjectSchema>({
        table: OBJECT_SCHEMAS_TABLE,
        params: {
            ...params,
            filters:[
                {
                    column: ***REMOVED***object_type_uuid***REMOVED***,
                    operator: ***REMOVED***eq***REMOVED***,
                    value: form.object_type_uuid
                },
                {
                    column: ***REMOVED***version***REMOVED***,
                    operator: ***REMOVED***eq***REMOVED***,
                    value: form.object_schema_version
                }
            ]
        },
        token,
        signal
     })
     return schema;
}



export const postObjectSchema = async ({
    object_schema,
    token,
    signal

}: {
    object_schema: Omit<IObjectSchema, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await postToPostgrest<Omit<IObjectSchema, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IObjectSchema>({
        table: OBJECT_SCHEMAS_TABLE,
        body: object_schema,
        token,
        signal
    });
    return newObjectSchema;
}

export const patchObjectSchema = async ({
    uuid,
    object_schema,
    token,
    signal

}: {
    uuid: string,
    object_schema: Omit<IObjectSchema, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await patchToPostgrest<Omit<IObjectSchema, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IObjectSchema>({
        uuid,
        table: OBJECT_SCHEMAS_TABLE,
        body: object_schema,
        token,
        signal
    });
    return newObjectSchema;
}