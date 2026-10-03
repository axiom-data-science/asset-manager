// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { IForm, IFormValues } from '@axdspub/axiom-ui-forms'
import { validate } from '@/lib/utils'
import { validateDocumentForm } from './documentValidation'

describe('validateDocumentForm', () => {
    it('resolves referenced schema constraints before validation', async () => {
        const schema = {
            type: 'object',
            definitions: {
                constrainedLabel: { type: 'string', minLength: 4 },
            },
            properties: {
                label: { $ref: '#/definitions/constrainedLabel' },
            },
        }
        const form = {
            id: 'edit-document',
            fields: [{ id: 'label', label: 'Label', type: 'text' }],
        } as IForm
        const formValues: IFormValues = { label: 'abc' }
        let schemaReceivedByValidator: Record<string, unknown> | undefined

        const result = await validateDocumentForm({
            form,
            formValues,
            schema,
            validate: async (args) => {
                schemaReceivedByValidator = args.schema
                return validate(args)
            },
        })

        expect(
            (schemaReceivedByValidator?.properties as Record<string, unknown>).label
        ).toEqual({ type: 'string', minLength: 4 })
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
    })
})