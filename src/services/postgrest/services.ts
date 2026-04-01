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
    uuid,
    uuidColumn = 'uuid',
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
                operator: 'eq' as const,
                value: uuid
            },
            ...(params?.filters ?? [])
        ]
    } : params;
    const url = postgrestUrl({table, params: p});
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
        return result as unknown as R;
    } catch (error) {
        console.error('Error posting to Postgrest:', error);
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
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal
        });
        if(!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }catch(error){
        console.error('Error deleting from Postgrest:', error);
        throw new Error(`Error deleting from Postgrest: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const patchToPostgrest = async <T, R=T>({
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
}): Promise<R> => {
    try {
        const url = postgrestUrl({table, params});
        const response = await fetch(url, {
            method: 'PATCH',
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
        return result as unknown as R;
    }catch(error){
        console.error('Error patching to Postgrest:', error);
        throw new Error(`Error patching to Postgrest: ${error instanceof Error ? error.message : String(error)}`);
    }
}