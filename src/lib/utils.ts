import type { IValidationError } from '@/types/types'
import { getters, schemaToFormUtils, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { useQueries } from '@tanstack/react-query'
import { clsx, type ClassValue } from 'clsx'
import type { queryOptions } from 'node_modules/@tanstack/react-query/build/legacy/queryOptions'
import { twMerge } from 'tailwind-merge'
import { get, omit } from 'lodash-es'

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
    if (f.required && (formValues[f.id] === undefined || formValues[f.id] === '')) {
      valid = false
      errors.push({
        field: f.id,
        message: `${messagePrefix ? messagePrefix + ': ' : ''}${f.label} is required.`,
      })
    }
  })
  if (schemaFields?.length) {
    schemaFields.forEach((field) => {
      const schemaValid = schemaToFormUtils.validateSchema(get(formValues, field) ?? {})
      if (schemaValid.error) {
        errors.push({
          field,
          message: `${messagePrefix ? messagePrefix + ': ' : ''}${field} field is not a valid JSON schema. ${schemaValid.error}`,
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
      errors.push(
        ...againstSchema.map((e) => {
          const fieldKey = e.split(' ')[0].replace(/\//g, '.').replace(/^\./, '')
          const field = fieldsById[fieldKey as keyof typeof fieldsById]?.label ?? fieldKey
          const currentValue = get(formValues, fieldKey)
          return {
            field: fieldKey,
            message: `${messagePrefix ? messagePrefix + ': ' : ''}${field} ${e.split(' ').slice(1).join(' ')}${typeof currentValue !== 'undefined' ? `. Current value: ${JSON.stringify(currentValue)}` : ''} [${fieldKey}]`,
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
