import type { IValidationError } from "@/types/types"
import type { IForm, IFormValues } from "@axdspub/axiom-ui-forms"
import { clsx, type ClassValue } from "clsx"
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