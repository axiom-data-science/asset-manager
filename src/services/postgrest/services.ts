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
    params, 
    token,
    signal
}: { 
    table: string, 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<T> => {
    const url = postgrestUrl({table, params});
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

export const postToPostgrest = async <T>({
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
}): Promise<T> => {
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
    return result as unknown as T;
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
}

export const patchToPostgrest = async <T>({
    table,
    params,
    token,
    signal,
    body
}: {
    table: string,
    params?: IPostgrestParams,
    token: string,
    signal?: AbortSignal,
    body: Partial<T>
}): Promise<void> => {
    const url = postgrestUrl({table, params});
    const response = await fetch(url, {
        method: ***REMOVED***PATCH***REMOVED***,
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`,
            ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***
        },
        signal,
        body: JSON.stringify(body)
    });
    if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}