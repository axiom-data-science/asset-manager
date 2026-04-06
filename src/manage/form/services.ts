import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IAssetForm, IPostgrestParams } from "@/types/types";

const FORMS_TABLE = 'form';

export const fetchForms = async({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IAssetForm[]> => {

    const documents = await fetchListFromPostgrest<IAssetForm>({
        table: FORMS_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchForm = async ({
    uuid,
    params,
    token,
    signal
}:{
    uuid: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const document = await fetchSingleFromPostgrest<IAssetForm>({
        table: FORMS_TABLE,
        uuid,
        params,
        token,
        signal
    })   
    return document;

}

export const fetchFormRollup = async ({
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
        table: FORMS_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const postForm = async ({
    form,
    token,
    signal

}: {
    form: Omit<IAssetForm, 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await postToPostgrest<Omit<IAssetForm, 'uuid' | 'created_at' | 'updated_at'>, IAssetForm>({
        table: FORMS_TABLE,
        body: form,
        token,
        signal
    });
    return newForm;
}



export const patchForm = async ({
    uuid,
    form,
    token,
    signal

}: {
    uuid: string,
    form: Omit<IAssetForm, 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await patchToPostgrest<Omit<IAssetForm, 'created_at' | 'updated_at'>, IAssetForm>({
        uuid,
        table: FORMS_TABLE,
        body: form,
        token,
        signal
    });
    return newForm;
}