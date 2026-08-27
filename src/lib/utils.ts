import type { IValidationError } from '@/types/types'
import { getters, schemaToFormUtils, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { QueryClient, queryOptions, useQueries } from '@tanstack/react-query'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { get, omit } from 'lodash-es'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const validate = async ({
  form,
  formValues,
  schema,
  schemaFields,
}: {
  form: IForm
  formValues: IFormValues
  schema?: Record<string, unknown>
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
    if (f.required && (formValues[f.id] === undefined || formValues[f.id] === '')) {
      valid = false
      errors.push({
        field: f.id,
        fieldLabel: f.label ?? undefined,
        message: `is required.`,
      })
    }
  })
  if (schemaFields?.length) {
    schemaFields.forEach((field) => {
      const schemaValid = schemaToFormUtils.validateSchema(get(formValues, field) ?? {})
      if (schemaValid.error) {
        errors.push({
          field,
          message: `field is not a valid JSON schema. ${schemaValid.error}`,
        })
        valid = false
      }
    })
  }
  if (schema !== undefined) {
    const againstSchema = schemaToFormUtils.validateAgainstSchema(
      omit(schema, '$schema'),
      formValues
    )
    if (againstSchema?.length) {
      valid = false
      againstSchema.forEach((e) => {
        const fieldKey = e.field?.length ? e.field : e.message.split(' ')[0].replace(/\//g, '.').replace(/^\./, '')
        const field = fieldsById[fieldKey as keyof typeof fieldsById]
        const fieldLabel = field?.label ?? undefined
        const currentValue = get(formValues, fieldKey)
        if (!errors.find(e => e.field === fieldKey)) {
          errors.push({
            field: fieldKey,
            fieldLabel,
            path: field?.path?.map(d => d.id).join('.') ?? undefined,
            message: `${e.message.split(' ').slice(1).join(' ')}${typeof currentValue !== 'undefined' ? `. Current value: ${JSON.stringify(currentValue)}` : ''}`,
          })
        }
      })
    }
  }
  return { valid, errors }
}

export const invalidateCache = ({
  queryClient,
  queryKey,
  setContextReloadToken
}: {
  queryClient: QueryClient
  queryKey: string[],
  setContextReloadToken: (updater: (prev: number) => number) => void
}) => {
  queryClient.invalidateQueries({ queryKey })
  setContextReloadToken((prev) => prev + 1)
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
    const valuesToSave = {} as IFormValues
    Object.keys(values).forEach((key) => {
      if (key === 'auto_slug') return
      if (presentationFields && presentationFields.includes(key)) return
      valuesToSave[key] = values[key]
    })
    return valuesToSave
  }
}

export const getBrand = (): string | undefined => {
  const origin = window.location.origin
  const url = new URL(window.location.href)
  const brand =
    origin.match(/modl-asset/) /* || origin.match(/localhost/) */
      ? 'modl'
      : (url.searchParams.get('brand') ?? undefined)
  return brand
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isValidUUID = (str: string): boolean => {
  return UUID_REGEX.test(str)
}

type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
  ? Param
  : never

// inserts values from params into string template
// uses react-router-dom style /document/edit/:uuid/object_type/:object_type_uuid/form/:form_uuid
export const buildStringFromTemplate = <T extends string>(
  template: T,
  params: Record<ExtractParams<T>, string | number>
): string => {
  let str: string = template
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' || typeof value === 'number') {
      str = str.replace(`:${key}`, String(value))
    }
  }
  return str
}
