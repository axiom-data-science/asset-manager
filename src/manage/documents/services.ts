import { getDocuments } from "@/manage/documents/endpoints"
import type { IDocument, IPostgrestParams } from "@/types/types";

export const fetchDocuments = async <T>({
    params, 
    token,
    signal
}: { 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<IDocument<T>[]> => {
    const url = getDocuments(params)
    const response = await fetch(url, {
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`
        },
        signal
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    const documents = await response.json();
    return documents as unknown as IDocument<T>[];

}

export const fetchDocumentRollup = async ({
    rollup,
    params, 
    token,
    signal
}: {
    rollup: string 
    params?: IPostgrestParams, 
    token: string ,
    signal?: AbortSignal
}): Promise<{label: string, count: number}[]> => {
    const p: IPostgrestParams = {
        ...(params ?? {}),
        select: [
            {
                column: rollup,
                fn: ***REMOVED***count***REMOVED***
            },
            {
                column: rollup
            }
        ]
    } 
    const url = getDocuments(p)
    const response = await fetch(url, {
        headers: {
            ***REMOVED***Authorization***REMOVED***: `Bearer ${token}`
        },
        signal
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    const documents = await response.json();
    return documents.map((r: { count: number, [key: string]: string | number }) => {
        return {
            ...r,
            label: r[rollup]
        }
    });

}