import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IFieldOverrideConfig, IFormToFieldConfig, IFormToFieldConfigWithDetails, IObjectSchema, IPostgrestParams } from "@/types/types";

export const FIELDS_CONFIG_TO_FORM_TABLE = 'fields_override_config_to_form';
export const FIELD_CONFIG_TABLE = 'fields_override_config';

export const postFormToFieldsConfig = async ({
    formToFieldsConfig,
    token,
    signal
}: {
    formToFieldsConfig: Omit<IFormToFieldConfig, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await postToPostgrest<Omit<IFormToFieldConfig, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>, IFormToFieldConfig>({
        table: FIELDS_CONFIG_TO_FORM_TABLE,
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
    formToFieldsConfig: Omit<IFormToFieldConfig, 'owner_sub' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await patchToPostgrest<Omit<IFormToFieldConfig, 'owner_sub' | 'created_at' | 'updated_at'>, IFormToFieldConfig>({
        uuid,
        table: FIELDS_CONFIG_TO_FORM_TABLE,
        body: formToFieldsConfig,
        token,
        signal
    });
    return newFormToFieldsConfig;
}


export const fetchFieldConfigs = async({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}) => {

    const documents = await fetchListFromPostgrest<IFormToFieldConfigWithDetails>({
        table: FIELD_CONFIG_TABLE,
        params,
        token,
        signal
    });
    return documents;

}

export const fetchFieldConfigsAtForm = async({
    form_uuid,
    token,
    signal,
    params
}: {
    form_uuid: string,
    token: string,
    signal?: AbortSignal,
    params?: IPostgrestParams
}): Promise<IFormToFieldConfigWithDetails[]> => {
    const mergedParams: IPostgrestParams = {
        ...params,
        filters: [
            {
                column: 'form_uuid',
                operator: 'eq',
                value: form_uuid
            }
        ]
    }
    const fieldConfigs = await fetchFormToFieldConfigs({params: mergedParams, token, signal});
    return fieldConfigs;
}

export const fetchFieldConfigsAtObjectType = async({
    object_type_uuid,
    token,
    signal,
    params
}: {
    object_type_uuid: string,
    token: string,
    signal?: AbortSignal,
    params?: IPostgrestParams
})=> {
    const mergedParams: IPostgrestParams = {
        ...params,
        filters: [
            {
                column: 'object_type_uuid',
                operator: 'eq',
                value: object_type_uuid
            }
        ]
    }
    const fieldConfigs = await fetchFormToFieldConfigs({params: mergedParams, token, signal});
    return fieldConfigs;
}

export const fetchFormToFieldConfigs = async({
    params,
    token,
    signal
}: {
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}) => {

    const combinedParams = {
        ...params,
        select: [
            '*',
            'fields_override_config(*)'
        ]
    }

    const formToFieldConfigs = await fetchListFromPostgrest<IFormToFieldConfigWithDetails>({
        table: FIELDS_CONFIG_TO_FORM_TABLE,
        params: combinedParams,
        token,
        signal
    });
    return formToFieldConfigs;

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
        table: FIELD_CONFIG_TABLE,
        uuid,
        params,
        token,
        signal
    })   
    return document;

}

export const fetchFieldConfigRollup = async ({
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
        table: FIELD_CONFIG_TABLE,
        rollupColumn: rollup,
        params,
        token,
        signal
    });
    return list


}

export const postFieldConfig = async ({
    fields_override_config,
    token,
    signal

}: {
    fields_override_config: Omit<IFieldOverrideConfig, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await postToPostgrest<Omit<IFieldOverrideConfig, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>, IFieldOverrideConfig>({
        table: FIELD_CONFIG_TABLE,
        body: fields_override_config,
        token,
        signal
    });
    return newFieldOverrideConfig;
}

export const patchFieldConfig = async ({
    uuid,
    fields_override_config,
    token,
    signal

}: {
    uuid: string,
    fields_override_config: Omit<IFieldOverrideConfig, 'owner_sub' | 'updated_at' | 'created_at'>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await patchToPostgrest<Omit<IFieldOverrideConfig, 'owner_sub' | 'updated_at' | 'created_at'>, IFieldOverrideConfig>({
        uuid,
        table: FIELD_CONFIG_TABLE,
        body: fields_override_config,
        token,
        signal
    });
    return newFieldOverrideConfig;
}