import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IDocument, IPostgrestParams } from "@/types/types";

export const DOCUMENTS_TABLE = ***REMOVED***document***REMOVED***;

export const fetchDocuments = async <T>({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IDocument<T>[]> => {

    const documents = await fetchListFromPostgrest<IDocument<T>>({
        table: DOCUMENTS_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchDocument = async <T>({
    uuid,
    params,
    token,
    signal
}:{
    uuid: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument<T>> => {
    const document = await fetchSingleFromPostgrest<IDocument<T>>({
        table: DOCUMENTS_TABLE,
        uuid,
        params,
        token,
        signal
    })   
    return document;

}

export const fetchDocumentRollup = async ({
    rollup,
    params, 
    token,
    signal
}: {
    rollup: string 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<{label: string, count: number}[]> => {
    
    const list = await fetchRollupFromPostgrest({
        table: DOCUMENTS_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const postDocument = async <T>({
    document,
    token,
    signal
}: {
    document: Omit<IDocument<T>, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument<T>> => {
    const doc = await postToPostgrest<Omit<IDocument<T>, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IDocument<T>>({
        table: DOCUMENTS_TABLE,
        body: document,
        token,
        signal
    });
    return doc;
}

export const patchDocument = async ({
    uuid,
    document,
    token,
    signal

}: {
    uuid: string,
    document: Omit<IDocument, ***REMOVED***updated_at***REMOVED*** | ***REMOVED***created_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument> => {
    const newFieldOverrideConfig = await patchToPostgrest<Omit<IDocument, ***REMOVED***updated_at***REMOVED*** | ***REMOVED***created_at***REMOVED***>, IDocument>({
        uuid,
        table: DOCUMENTS_TABLE,
        body: document,
        token,
        signal
    });
    return newFieldOverrideConfig;
}
