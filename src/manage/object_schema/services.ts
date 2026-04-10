import { fetchForm } from "@/manage/form/services";
import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IObjectSchema, IObjectSchemaWithObjectType, IPostgrestParams } from "@/types/types";

const OBJECT_SCHEMAS_TABLE = 'object_schema';

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

export const fetchObjectSchemaAndObjectTypeAtObjectType = async ({
    object_type_uuid,
    params,
    token,
    signal
}:{
    object_type_uuid: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchemaWithObjectType> => {
    const combinedParams: IPostgrestParams = {
        ...params,
        filters: [
            {
                column: 'object_type_uuid',
                operator: 'eq',
                value: object_type_uuid
            }
        ],
        select: [
            '*',
            'object_type(*)'
        ]
    }
    const result = await fetchSingleFromPostgrest<IObjectSchemaWithObjectType>({
        table: OBJECT_SCHEMAS_TABLE,
        params: combinedParams,
        token,
        signal
    })   
    return result;

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
                    column: 'object_type_uuid',
                    operator: 'eq',
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
            select:['object_type_uuid', 'object_schema_version'],
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
                    column: 'object_type_uuid',
                    operator: 'eq',
                    value: form.object_type_uuid
                },
                {
                    column: 'version',
                    operator: 'eq',
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
    object_schema: Omit<IObjectSchema, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await postToPostgrest<Omit<IObjectSchema, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>, IObjectSchema>({
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
    object_schema: Omit<IObjectSchema, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectSchema> => {
    const newObjectSchema = await patchToPostgrest<Omit<IObjectSchema, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>, IObjectSchema>({
        uuid,
        table: OBJECT_SCHEMAS_TABLE,
        body: object_schema,
        token,
        signal
    });
    return newObjectSchema;
}