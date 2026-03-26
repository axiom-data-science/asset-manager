import { APPS_API_BASE_URL } from "@/config/config"
import type { IPostgrestParams } from "@/types/types";




export const postgrestArgs = <T,>(params: IPostgrestParams<T>): URLSearchParams => {


    const args = new URLSearchParams();



    (params.filters ?? []).forEach(f => args.append(String(f.column), `${f.not ? 'not.' : ''}${f.operator ?? 'eq'}.${f.value}`));
    if (params.limit !== undefined) {
        args.append('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
        args.append('offset', params.offset.toString());
    }
    if (params.order !== undefined && params.order.length > 0) {
        args.append('order', params.order.map(o => `${String(o.column)}.${String(o.dir)}`).join(','));
    }
    if (params.select !== undefined) {
        const select = params.select.map(s => {
            const o = typeof s === 'string' ? { column: s } : s;
            return `${o.as ? `${o.as}:` : ''}${String(o.column)}${o.fn !== undefined ? `.${o.fn}()` : ''}`
        }).join(',');
        args.append('select', select);
    }
    return args;
}



export const getDocument = (uuid: string, prop: string = 'uuid') => {
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