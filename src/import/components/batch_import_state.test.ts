import { describe, expect, it } from 'vitest'
import { applyBatchResults, createImportRows, importCandidateListKey } from './batch_import_state'

const documents = [
    {
        uuid: 'one', slug: 'one', label: 'One', data: {},
        provenance: { sourceId: 'test', externalId: 'one' },
    },
    {
        uuid: 'two', slug: 'two', label: 'Two', data: {},
        provenance: { sourceId: 'test', externalId: 'two' },
    },
]

describe('batch import row state', () => {
    it('uses record identity rather than array identity to detect document changes', () => {
        expect(importCandidateListKey(documents.map((document) => ({ ...document })))).toBe(
            importCandidateListKey(documents)
        )
        expect(importCandidateListKey(documents.slice(0, 1))).not.toBe(
            importCandidateListKey(documents)
        )
    })

    it('initializes new records as selected and ready', () => {
        expect(createImportRows(documents)).toEqual([
            { ...documents[0], selected: true, imported: false, loading: false },
            { ...documents[1], selected: true, imported: false, loading: false },
        ])
    })

    it('marks successful records imported and keeps failed records selected for retry', () => {
        const rows = createImportRows(documents).map((row) => ({ ...row, loading: true }))
        const results: PromiseSettledResult<void>[] = [
            { status: 'fulfilled', value: undefined },
            { status: 'rejected', reason: new Error('Document could not be saved') },
        ]

        const updated = applyBatchResults(rows, rows, results)

        expect(updated[0]).toMatchObject({ imported: true, selected: false, loading: false })
        expect(updated[1]).toMatchObject({
            imported: false,
            selected: true,
            loading: false,
            error: 'Document could not be saved',
        })
    })

    it('classifies a duplicate constraint failure for contextual recovery', () => {
        const rows = createImportRows(documents)
        const updated = applyBatchResults(rows, [rows[0]], [{
            status: 'rejected',
            reason: new Error(
                'HTTP error! status: 409. duplicate key value violates unique constraint "document_type_slug_uniq"'
            ),
        }])

        expect(updated[0]).toMatchObject({
            selected: true,
            imported: false,
            errorKind: 'duplicate-type-slug',
        })
        expect(updated[0].error).toContain('already exists')
    })
})