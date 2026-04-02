import { postgrestRollupArgs, postgrestUrl } from "@/services/postgrest/endpoints";
import type { IPostgrestParams } from "@/types/types";

export const fetchListFromPostgrest = async <T>({
    table,
    params, 
    token,
    signal
}: { 
    table: string,
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<T[]> => {
    const url = postgrestUrl({table, params});
    const response = await fetch(url, {
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`
        },
        signal
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    const result = await response.json();
    return result as unknown as T[];

}


export const fetchRollupFromPostgrest = async ({
    table,
    rollupColumn,
    params, 
    token,
    signal
}: {
    table: string,
    rollupColumn: string 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<{label: string, count: number}[]> => {
    const args = postgrestRollupArgs({rollupColumn, params});
    const url = postgrestUrl({table, args});
    const response = await fetch(url, {
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`
        },
        signal
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const list = await response.json() as unknown as {[key: string]: string | number}[];

    return list.map(r => {
        return {
            count: Number(r.count),
            label: r[rollupColumn] as string
        }
    });


}


export const fetchSingleFromPostgrest = async <T>({
    table,
    uuid,
    uuidColumn = ***REMOVED***uuid***REMOVED***,
    params, 
    token,
    signal
}: { 
    table: string, 
    uuid?: string,
    uuidColumn?: string,
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<T> => {
    const p = uuid ? {
        ...params,
        filters: [
            {
                column: uuidColumn,
                operator: ***REMOVED***eq***REMOVED*** as const,
                value: uuid
            },
            ...(params?.filters ?? [])
        ]
    } : params;
    const url = postgrestUrl({table, params: p});
    const response = await fetch(url, {
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`,
            ***REMOVED***Accept***REMOVED***: ***REMOVED***application/vnd.pgrst.object+json***REMOVED***
        },
        signal
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    const result = await response.json();
    return result as unknown as T;
}

export const postToPostgrest = async <T, R = T>({
    table,
    params,
    token,
    signal,
    body
}: {
    table: string,
    params?: IPostgrestParams,
    token: string ,
    signal?: AbortSignal,
    body: T
}): Promise<R> => {
    try{
        const url = postgrestUrl({table, params});
        const response = await fetch(url, {
            method: ***REMOVED***POST***REMOVED***,
            headers: {
                ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`,
                ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
                ***REMOVED***Prefer***REMOVED***: ***REMOVED***return=representation***REMOVED***
            },
            signal,
            body: JSON.stringify(body)
        });
        if(!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result as unknown as R;
    } catch (error) {
        console.error(***REMOVED***Error posting to Postgrest:***REMOVED***, error);
        throw error;
    }
}

export const deleteFromPostgrest = async ({
    table,
    params,
    token,
    signal
}: {
    table: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal
}): Promise<void> => {
    try{
        const url = postgrestUrl({table, params});
        const response = await fetch(url, {
            method: ***REMOVED***DELETE***REMOVED***,
            headers: {
                ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`
            },
            signal
        });
        if(!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }catch(error){
        console.error(***REMOVED***Error deleting from Postgrest:***REMOVED***, error);
        throw new Error(`Error deleting from Postgrest: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const patchToPostgrest = async <T, R=T>({
    uuid,
    uuidColumn = ***REMOVED***uuid***REMOVED***,
    table,
    params,
    token,
    signal,
    body
}: {
    uuid: string,
    uuidColumn?: string,
    table: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal,
    body: Partial<T>
}): Promise<R> => {
    try {
        const p = {
            ...params,
            filters: [
                {
                    column: uuidColumn,
                    operator: ***REMOVED***eq***REMOVED*** as const,
                    value: uuid
                },
                ...(params?.filters ?? [])
            ]
        }
        const url = postgrestUrl({table, params: p});
        const response = await fetch(url, {
            method: ***REMOVED***PATCH***REMOVED***,
            headers: {
                ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`,
                ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
                ***REMOVED***Prefer***REMOVED***: ***REMOVED***return=representation***REMOVED***
            },
            signal,
            body: JSON.stringify(body)
        });
        if(!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result as unknown as R;
    }catch(error){
        console.error(***REMOVED***Error patching to Postgrest:***REMOVED***, error);
        throw new Error(`Error patching to Postgrest: ${error instanceof Error ? error.message : String(error)}`);
    }
}