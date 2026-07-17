import type { IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { getters, schemaToFormUtils, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { queryOptions, useQueries } from ***REMOVED***@tanstack/react-query***REMOVED***
import { clsx, type ClassValue } from ***REMOVED***clsx***REMOVED***
import { twMerge } from ***REMOVED***tailwind-merge***REMOVED***
import { get, omit } from ***REMOVED***lodash-es***REMOVED***

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const validate = async ({
  form,
  formValues,
  schema,
  messagePrefix,
  schemaFields,
}: {
  form: IForm
  formValues: IFormValues
  schema?: Record<string, unknown>
  messagePrefix?: string
  schemaFields?: string[]
}): Promise<{
  valid: boolean
  errors: IValidationError[]
}> => {
  const errors: IValidationError[] = []
  let valid = true

  const flattenedFields = getters.getFieldsFromFormSection(form)
  const fieldsById = Object.fromEntries(flattenedFields.map((f) => [f.id, f]))
  flattenedFields.forEach((f) => {
    if (f.required && (formValues[f.id] === undefined || formValues[f.id] === ***REMOVED******REMOVED***)) {
      valid = false
      errors.push({
        field: f.id,
        message: `${messagePrefix ? messagePrefix + ***REMOVED***: ***REMOVED*** : ***REMOVED******REMOVED***}${f.label} is required.`,
      })
    }
  })
  if (schemaFields?.length) {
    schemaFields.forEach((field) => {
      const schemaValid = schemaToFormUtils.validateSchema(get(formValues, field) ?? {})
      if (schemaValid.error) {
        errors.push({
          field,
          message: `${messagePrefix ? messagePrefix + ***REMOVED***: ***REMOVED*** : ***REMOVED******REMOVED***}${field} field is not a valid JSON schema. ${schemaValid.error}`,
        })
        valid = false
      }
    })
  }
  if (schema !== undefined) {
    const againstSchema = schemaToFormUtils.validateAgainstSchema(
      omit(schema, ***REMOVED***$schema***REMOVED***),
      formValues
    )
    if (againstSchema?.length) {
      valid = false
      errors.push(
        ...againstSchema.map((e) => {
          const fieldKey = e.split(***REMOVED*** ***REMOVED***)[0].replace(/\//g, ***REMOVED***.***REMOVED***).replace(/^\./, ***REMOVED******REMOVED***)
          const field = fieldsById[fieldKey as keyof typeof fieldsById]?.label ?? fieldKey
          const currentValue = get(formValues, fieldKey)
          return {
            field: fieldKey,
            message: `${messagePrefix ? messagePrefix + ***REMOVED***: ***REMOVED*** : ***REMOVED******REMOVED***}${field} ${e.split(***REMOVED*** ***REMOVED***).slice(1).join(***REMOVED*** ***REMOVED***)}${typeof currentValue !== ***REMOVED***undefined***REMOVED*** ? `. Current value: ${JSON.stringify(currentValue)}` : ***REMOVED******REMOVED***} [${fieldKey}]`,
          }
        })
      )
    }
  }
  return { valid, errors }
}

export const useQueriesWithSignatures = (queryObject: ReturnType<typeof queryOptions>[]) => {
  const r = useQueries({
    queries: Object.values(queryObject),
    combine: (results) => {
      const isLoading = results.some((r) => r.isLoading)
      return {
        isLoading,
        isPending: results.some((r) => r.isPending),
        error: results.find((r) => r.error)?.error ?? null,
        data: !isLoading
          ? Object.fromEntries(
            results.map((r, index) => (r.data ? [Object.keys(queryObject)[index], r.data] : []))
          )
          : null,
      }
    },
  })
  return r
}

export const removeUndefinedAndNullKeys = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)
  )
}


export const createFilterForSaveFn = (presentationFields?: string[]) => {
  return (values: IFormValues): IFormValues => {
    const valuesToSave = {} as IFormValues;
    Object.keys(values).forEach(key => {
      if (key === ***REMOVED***auto_slug***REMOVED***) return;
      if (presentationFields && presentationFields.includes(key)) return;
      valuesToSave[key] = values[key];
    })
    return valuesToSave;
  }

}

export const getBrand = (): string | undefined => {
  const origin = window.location.origin
  const url = new URL(window.location.href)
  const brand = origin.match(/modl-asset/) || origin.match(/localhost/)
    ? ***REMOVED***modl***REMOVED***
    : url.searchParams.get(***REMOVED***brand***REMOVED***) ?? undefined
  return brand

}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidUUID = (str: string): boolean => {
  return UUID_REGEX.test(str);
}