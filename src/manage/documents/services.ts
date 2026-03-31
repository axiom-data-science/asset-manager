import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest } from "@/services/postgrest/services";
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
    token,
    signal
}:{
    uuid: string,
    token: string,
    signal?: AbortSignal
}): Promise<IDocument<T>> => {
    const document = await fetchSingleFromPostgrest<IDocument<T>>({
        table: DOCUMENTS_TABLE,
        params: {
            filters: [
                {
                    column: 'uuid',
                    operator: 'eq',
                    value: uuid
                }
            ]
        },
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