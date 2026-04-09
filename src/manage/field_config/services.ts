import { fetchListFromPostgrest, fetchRollupFromPostgrest, fetchSingleFromPostgrest, patchToPostgrest, postToPostgrest } from "@/services/postgrest/services";
import type { IFieldOverrideConfig, IFormToFieldConfig, IFormToFieldConfigWithDetails, IObjectSchema, IPostgrestParams } from "@/types/types";

export const FIELDS_CONFIG_TO_FORM_TABLE = ***REMOVED***fields_override_config_to_form***REMOVED***;
export const FIELD_CONFIG_TABLE = ***REMOVED***fields_override_config***REMOVED***;

export const postFormToFieldsConfig = async ({
    formToFieldsConfig,
    token,
    signal
}: {
    formToFieldsConfig: Omit<IFormToFieldConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await postToPostgrest<Omit<IFormToFieldConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IFormToFieldConfig>({
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
    formToFieldsConfig: Omit<IFormToFieldConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IFormToFieldConfig> => {
    const newFormToFieldsConfig = await patchToPostgrest<Omit<IFormToFieldConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IFormToFieldConfig>({
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
                column: ***REMOVED***form_uuid***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
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
                column: ***REMOVED***object_type_uuid***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
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
            ***REMOVED*******REMOVED***,
            ***REMOVED***fields_override_config(*)***REMOVED***
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
    fields_override_config: Omit<IFieldOverrideConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await postToPostgrest<Omit<IFieldOverrideConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>, IFieldOverrideConfig>({
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
    fields_override_config: Omit<IFieldOverrideConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***updated_at***REMOVED*** | ***REMOVED***created_at***REMOVED***>,
    token: string,
    signal?: AbortSignal
}): Promise<IFieldOverrideConfig> => {
    const newFieldOverrideConfig = await patchToPostgrest<Omit<IFieldOverrideConfig, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***updated_at***REMOVED*** | ***REMOVED***created_at***REMOVED***>, IFieldOverrideConfig>({
        uuid,
        table: FIELD_CONFIG_TABLE,
        body: fields_override_config,
        token,
        signal
    });
    return newFieldOverrideConfig;
}