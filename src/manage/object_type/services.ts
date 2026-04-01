import type { IObjectType } from "@/manage/object_type/types";
import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IPostgrestParams } from "@/types/types";

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

export const updateObjectType = async ({
    object_type,
    token,
    signal

}: {
    object_type: Pick<IObjectType, ***REMOVED***label***REMOVED*** | ***REMOVED***description***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IObjectType> => {
    const newObjectType = await patchToPostgrest<Pick<IObjectType, ***REMOVED***label***REMOVED*** | ***REMOVED***description***REMOVED***>, IObjectType>({
        table: OBJECT_TYPES_TABLE,
        body: object_type,
        token,
        signal
    });
    return newObjectType;
}