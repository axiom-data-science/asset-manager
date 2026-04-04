import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IPostgrestParams, IObjectType } from "@/types/types";

const OBJECT_TYPES_TABLE = ***REMOVED***object_type***REMOVED***;



export const fetchObjectTypes = async({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IObjectType[]> => {

    const documents = await fetchListFromPostgrest<IObjectType>({
        table: OBJECT_TYPES_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchObjectType = async ({
    uuid,
    params,
    token,
    signal
}:{
    uuid: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectType> => {
    const document = await fetchSingleFromPostgrest<IObjectType>({
        table: OBJECT_TYPES_TABLE,
        uuid,
        params,
        token,
        signal
    })   
    return document;

}

export const fetchObjectCategories = async ({
    token,
    signal
}:{
    token: string,
    signal?: AbortSignal
}): Promise<string[]> => {
    const list = await fetchListFromPostgrest<{
        enum_name: string,
        enum_value:string
    }>({
        table: ***REMOVED***enum_values***REMOVED***,
        token,
        signal,
        params: {
            filters:[
                {
                    column: ***REMOVED***enum_name***REMOVED***,
                    operator: ***REMOVED***eq***REMOVED***,
                    value: ***REMOVED***object_category***REMOVED***
                }
            ]
        }
    })

    return list.map(d => d.enum_value);
    
}

export const fetchObjectTypeRollup = async ({
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
        table: OBJECT_TYPES_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const postObjectType = async ({
    object_type,
    token,
    signal

}: {
    object_type: Pick<IObjectType, ***REMOVED***label***REMOVED*** | ***REMOVED***description***REMOVED*** | ***REMOVED***slug***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectType> => {
    const newObjectType = await postToPostgrest<Pick<IObjectType, ***REMOVED***label***REMOVED*** | ***REMOVED***description***REMOVED*** | ***REMOVED***slug***REMOVED***>, IObjectType>({
        table: OBJECT_TYPES_TABLE,
        body: object_type,
        token,
        signal
    });
    return newObjectType;
}

export const patchObjectType = async ({
    uuid,
    object_type,
    token,
    signal

}: {
    uuid: string,
    object_type: IObjectType,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectType> => {
    const newObjectType = await patchToPostgrest<IObjectType>({
        uuid,
        table: OBJECT_TYPES_TABLE,
        body: object_type,
        token,
        signal
    });
    return newObjectType;
}