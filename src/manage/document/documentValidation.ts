import { resolveRefs, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import type { JSONSchema6 } from 'json-schema'
import type { IValidationError } from '@/types/types'

type ValidateDocumentForm = (args: {
    form: IForm
    formValues: IFormValues
    schema?: Record<string, unknown>
}) => Promise<{ valid: boolean; errors: IValidationError[] }>

export const validateDocumentForm = async ({
    form,
    formValues,
    schema,
    validate,
}: {
    form: IForm
    formValues: IFormValues
    schema?: Record<string, unknown>
    validate: ValidateDocumentForm
}): Promise<{ valid: boolean; errors: IValidationError[] }> => {
    const resolvedSchema = schema
        ? (resolveRefs(schema as JSONSchema6) as Record<string, unknown>)
        : undefined

    return validate({ form, formValues, schema: resolvedSchema })
}