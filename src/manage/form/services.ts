import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IAssetForm, IPostgrestParams } from "@/types/types";

export const FORMS_TABLE = ***REMOVED***form***REMOVED***;

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
    form: Omit<IAssetForm, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await postToPostgrest<Omit<IAssetForm, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IAssetForm>({
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
    form: Omit<IAssetForm, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IAssetForm> => {
    const newForm = await patchToPostgrest<Omit<IAssetForm, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IAssetForm>({
        uuid,
        table: FORMS_TABLE,
        body: form,
        token,
        signal
    });
    return newForm;
}