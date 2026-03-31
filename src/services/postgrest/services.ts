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
            'Authorization': `Bearer ${token}`
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
            'Authorization': `Bearer ${token}`
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
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.pgrst.object+json'
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
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
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
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
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
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        signal,
        body: JSON.stringify(body)
    });
    if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}