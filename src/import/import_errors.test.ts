import { describe, expect, it } from 'vitest'
import { classifyImportError } from './import_errors'

describe('classifyImportError', () => {
    it('recognizes the document type and slug uniqueness conflict', () => {
        expect(classifyImportError(new Error(
            'Error posting to Postgrest: HTTP error! status: 409. duplicate key value violates unique constraint "document_type_slug_uniq"'
        ))).toEqual({
            kind: 'duplicate-type-slug',
            status: 409,
            constraint: 'document_type_slug_uniq',
            message:
                'A document with this type and identifier already exists, but it was not available during duplicate checking. It may be hidden by permissions or was created after the check.',
        })
    })

    it('classifies permission, validation, network, and unknown failures', () => {
        expect(classifyImportError(new Error('HTTP error! status: 403'))).toMatchObject({
            kind: 'forbidden', status: 403,
        })
        expect(classifyImportError(new Error('HTTP error! status: 422'))).toMatchObject({
            kind: 'validation', status: 422,
        })
        expect(classifyImportError(new Error('Failed to fetch'))).toMatchObject({ kind: 'network' })
        expect(classifyImportError(new Error('Something else'))).toEqual({
            kind: 'unknown', status: undefined, message: 'Something else',
        })
    })
})