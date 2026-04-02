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

export const postObjectSchema = async ({
    object_schema,
    token,
    signal

}: {
    object_schema: Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await postToPostgrest<Omit<IObjectSchema, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IObjectSchema>({
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
    object_schema: IObjectSchema,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await patchToPostgrest<IObjectSchema>({
        uuid,
        table: OBJECT_SCHEMAS_TABLE,
        body: object_schema,
        token,
        signal
    });
    return newObjectSchema;
}