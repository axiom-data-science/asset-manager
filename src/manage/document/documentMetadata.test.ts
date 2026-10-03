import { describe, expect, it } from 'vitest'
import { getDocumentMetadata } from './documentMetadata'

describe('getDocumentMetadata', () => {
    it('uses mapped nested fields and falls back to form values', () => {
        expect(
            getDocumentMetadata({
                formValues: { label: 'Fallback label', description: 'Fallback description' },
                valuesToSave: {
                    metadata: { label: 'Mapped label', description: 'Mapped description' },
                },
                labelPath: 'metadata.label',
                descriptionPath: 'metadata.description',
            })
        ).toEqual({ label: 'Mapped label', description: 'Mapped description' })
    })
})