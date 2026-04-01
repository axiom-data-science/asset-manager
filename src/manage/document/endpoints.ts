import { postgrestUrl } from "@/services/postgrest/endpoints";
import type { IPostgrestParams } from "@/types/types";







export const getDocument = (uuid: string, prop: string = ***REMOVED***uuid***REMOVED***) => {
    return postgrestUrl(***REMOVED***document***REMOVED***, {
        filters: [
            {
                column: prop,
                operator: ***REMOVED***eq***REMOVED***,
                value: uuid
            }
        ]
    })
}


export const getDocuments = (params?: IPostgrestParams): string => {
    return postgrestUrl(***REMOVED***document***REMOVED***, params);
}