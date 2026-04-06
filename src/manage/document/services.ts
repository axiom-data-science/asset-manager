import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IDocument, IPostgrestParams } from "@/types/types";

const DOCUMENTS_TABLE = 'document';

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
    document: Omit<IDocument<T>, 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument<T>> => {
    const doc = await postToPostgrest<Omit<IDocument<T>, 'uuid' | 'created_at' | 'updated_at'>, IDocument<T>>({
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
    document: Omit<IDocument, 'updated_at' | 'created_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument> => {
    const newFieldOverrideConfig = await patchToPostgrest<Omit<IDocument, 'updated_at' | 'created_at'>, IDocument>({
        uuid,
        table: DOCUMENTS_TABLE,
        body: document,
        token,
        signal
    });
    return newFieldOverrideConfig;
}
