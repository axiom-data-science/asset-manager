
export const fetchListFromPostgrest = async <T>({
    url, 
    token,
    signal
}: { 
    url: string, 
    token: string ,
    signal?: AbortSignal
}): Promise<T[]> => {
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


export const fetchSingleFromPostgrest = async <T>({
    url, 
    token,
    signal
}: { 
    url: string, 
    token: string ,
    signal?: AbortSignal
}): Promise<T> => {
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