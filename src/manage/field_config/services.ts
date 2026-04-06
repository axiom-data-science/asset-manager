import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IFieldOverrideConfig, IFormToFieldConfig, IObjectSchema, IPostgrestParams } from "@/types/types";

const FIELDS_OVERRIDE_CONFIG_TO_FORM_TABLE = 'fields_override_config_to_form';
const FIELDS_OVERRIDE_CONFIG_TABLE = 'fields_override_config';







export const postFormToFieldsConfig = async ({
    formToFieldsConfig,
    token,
    signal
}: {
    formToFieldsConfig: Omit<IFormToFieldConfig, 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await postToPostgrest<Omit<IFormToFieldConfig, 'uuid' | 'created_at' | 'updated_at'>, IFormToFieldConfig>({
        table: FIELDS_OVERRIDE_CONFIG_TO_FORM_TABLE,
        body: formToFieldsConfig,
        token,
        signal
    });
    return newFormToFieldsConfig;
}

export const patchFormToFieldsConfig = async ({
    uuid,
    formToFieldsConfig,
    token,
    signal
}: {
    uuid: string,
    formToFieldsConfig: Omit<IFormToFieldConfig, 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await patchToPostgrest<Omit<IFormToFieldConfig, 'created_at' | 'updated_at'>, IFormToFieldConfig>({
        uuid,
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
        body: formToFieldsConfig,
        token,
        signal
    });
    return newFormToFieldsConfig;
}


export const fetchFieldsOverrideConfigs = async({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IObjectSchema[]> => {

    const documents = await fetchListFromPostgrest<IObjectSchema>({
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchFieldOverrideConfig = async ({
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
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
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
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const postFieldsOverrideConfig = async ({
    fields_override_config,
    token,
    signal

}: {
    fields_override_config: Omit<IFieldOverrideConfig, 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await postToPostgrest<Omit<IFieldOverrideConfig, 'uuid' | 'created_at' | 'updated_at'>, IFieldOverrideConfig>({
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
        body: fields_override_config,
        token,
        signal
    });
    return newFieldOverrideConfig;
}

export const patchFieldsOverrideConfig = async ({
    uuid,
    fields_override_config,
    token,
    signal

}: {
    uuid: string,
    fields_override_config: Omit<IFieldOverrideConfig, 'updated_at' | 'created_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await patchToPostgrest<Omit<IFieldOverrideConfig, 'updated_at' | 'created_at'>, IFieldOverrideConfig>({
        uuid,
        table: FIELDS_OVERRIDE_CONFIG_TABLE,
        body: fields_override_config,
        token,
        signal
    });
    return newFieldOverrideConfig;
}