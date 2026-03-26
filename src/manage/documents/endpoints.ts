import { APPS_API_BASE_URL } from "@/config/config"
import type { IPostgrestParams } from "@/types/types";




export const postgrestArgs = <T,>(params: IPostgrestParams<T>): URLSearchParams => {


    const args = new URLSearchParams();



    (params.filters ?? []).forEach(f => args.append(String(f.column), `${f.not ? ***REMOVED***not.***REMOVED*** : ***REMOVED******REMOVED***}${f.operator ?? ***REMOVED***eq***REMOVED***}.${f.value}`));
    if (params.limit !== undefined) {
        args.append(***REMOVED***limit***REMOVED***, params.limit.toString());
    }
    if (params.offset !== undefined) {
        args.append(***REMOVED***offset***REMOVED***, params.offset.toString());
    }
    if (params.order !== undefined && params.order.length > 0) {
        args.append(***REMOVED***order***REMOVED***, params.order.map(o => `${String(o.column)}.${String(o.dir)}`).join(***REMOVED***,***REMOVED***));
    }
    if (params.select !== undefined) {
        const select = params.select.map(s => {
            const o = typeof s === ***REMOVED***string***REMOVED*** ? { column: s } : s;
            return `${o.as ? `${o.as}:` : ***REMOVED******REMOVED***}${String(o.column)}${o.fn !== undefined ? `.${o.fn}()` : ***REMOVED******REMOVED***}`
        }).join(***REMOVED***,***REMOVED***);
        args.append(***REMOVED***select***REMOVED***, select);
    }
    return args;
}



export const getDocument = (uuid: string, prop: string = ***REMOVED***uuid***REMOVED***) => {
    return `${APPS_API_BASE_URL}/document/?${prop}=eq.${uuid}`
}


export const getDocuments = (params?: IPostgrestParams): string => {
    const url = new URL(`${APPS_API_BASE_URL}/document`);
    if (params) {
        const args = postgrestArgs(params);
        url.search = args.toString();
    }
    return url.toString();
}