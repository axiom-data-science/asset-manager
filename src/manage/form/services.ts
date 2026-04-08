import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IAssetForm, IPostgrestParams } from "@/types/types";

export const FORMS_TABLE = 'form';

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

export const fetchDefaultFormAtObjectType = async({
    object_type_uuid,
    token,
    signal
}:{
    object_type_uuid: string,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm | null> => {
    const form = await fetchSingleFromPostgrest<IAssetForm>({
        table: `/get_default_form_at_object_type_uuid?object_type_uuid=eq.${object_type_uuid}`,
        token,
        signal
    })
    if(form.uuid === null){
        return null
    }
    return form
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
    form: Omit<IAssetForm, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await postToPostgrest<Omit<IAssetForm, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>, IAssetForm>({
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
    form: Omit<IAssetForm, 'owner_sub' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await patchToPostgrest<Omit<IAssetForm, 'owner_sub' | 'created_at' | 'updated_at'>, IAssetForm>({
        uuid,
        table: FORMS_TABLE,
        body: form,
        token,
        signal
    });
    return newForm;
}