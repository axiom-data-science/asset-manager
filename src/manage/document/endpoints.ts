/* import { postgrestUrl } from "@/services/postgrest/endpoints";
import type { IPostgrestParams } from "@/types/types";







export const getDocument = (uuid: string, prop: string = 'uuid') => {
    return postgrestUrl('document', {
        filters: [
            {
                column: prop,
                operator: 'eq',
                value: uuid
            }
        ]
    })
}


export const getDocuments = (params?: IPostgrestParams): string => {
    return postgrestUrl('document', params);
} */