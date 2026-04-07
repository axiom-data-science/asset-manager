import type { IValidationError } from "@/types/types"
import type { IForm, IFormValues } from "@axdspub/axiom-ui-forms"
import { useQueries } from "@tanstack/react-query"
import { clsx, type ClassValue } from "clsx"
import type { queryOptions } from "node_modules/@tanstack/react-query/build/legacy/queryOptions"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const validate = async ({form, formValues, messagePrefix} : {form: IForm, formValues: IFormValues, messagePrefix?: string}): Promise<{
    valid: boolean,
    errors: IValidationError[]
}> => {
    const errors: IValidationError[] = [];
    let valid = true

    const doFlat = (fields: IForm[***REMOVED***fields***REMOVED***]): IForm[***REMOVED***fields***REMOVED***] => {
        return (fields ?? []).map(f => {
            return f.type === ***REMOVED***object***REMOVED*** && f.fields !== undefined ? doFlat(f.fields) : f
        }).flat(Infinity) as IForm[***REMOVED***fields***REMOVED***]
    }

    const flattenedFields = doFlat(form.fields) ?? []
    flattenedFields.forEach(f => {
            if (f.required && (formValues[f.id] === undefined || formValues[f.id] === ***REMOVED******REMOVED***)) {
                valid = false;
                errors.push({ field: f.id, message: `${messagePrefix ? messagePrefix + ***REMOVED***: ***REMOVED*** : ***REMOVED******REMOVED***}${f.label} is required.` });
            }
        })
    return { valid, errors };
}

export const useQueriesWithSignatures = (queryObject: ReturnType<typeof queryOptions>[]) => {
    const r = useQueries({
        queries: Object.values(queryObject),
        combine: (results) => {
            const isLoading = results.some(r => r.isLoading);
            return {
                isLoading,
                isPending: results.some(r => r.isPending),
                error: results.find(r => r.error)?.error ?? null,
                data: !isLoading ? Object.fromEntries(results.map((r, index) => r.data ? [Object.keys(queryObject)[index], r.data] : [])) : null
            }
        }
    })
    return r
}