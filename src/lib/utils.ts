import type { IForm, IFormValues } from "@axdspub/axiom-ui-forms"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const validate = async ({form, formValues, messagePrefix} : {form: IForm, formValues: IFormValues, messagePrefix?: string}): Promise<{
    valid: boolean,
    errors: {field: string, path?: string, message: string}[]
}> => {
    const errors: {field: string, path?: string, message: string}[] = [];
    let valid = true
    form?.fields?.forEach(f => {
            if (f.required && (formValues[f.id] === undefined || formValues[f.id] === ***REMOVED******REMOVED***)) {
                valid = false;
                errors.push({ field: f.id, message: `${messagePrefix ? messagePrefix + ***REMOVED***: ***REMOVED*** : ***REMOVED******REMOVED***}${f.label} is required.` });
            }
        })
    return { valid, errors };
}