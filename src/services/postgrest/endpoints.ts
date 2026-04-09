import { APPS_API_BASE_URL } from "@/config/config";
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
            return `${o.as ? `${o.as}:` : ''}${String(o.column)}${o.fn !== undefined ? `.${o.fn}()` : `${o.join !== undefined ? `(${o.join.table}${o.join.fields !== undefined ? `(${o.join.fields.join(',')})` : '(*)'})` : ''}`}`
        }).join(',');
        args.append('select', select);
    }
    return args;
}

export const postgrestRollupArgs = ({rollupColumn, params} : {rollupColumn: string, params?: IPostgrestParams}): URLSearchParams => {
    const p: IPostgrestParams = {
        ...(params ?? {}),
        select: [
            {
                column: rollupColumn,
                fn: 'count'
            },
            {
                column: rollupColumn
            }
        ]
    } 
    return postgrestArgs(p);
}


export const postgrestUrl = ({table, params, args}: {table: string, params?: IPostgrestParams, args?: URLSearchParams}): string => {
    const url = new URL(`${APPS_API_BASE_URL}/${table}`);
    if (args) {
        url.search = args.toString();
    } else if (params) {
        const args = postgrestArgs(params);
        url.search = args.toString();
    }
    return url.toString();
}