import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import { applyBatchResults, createImportRows, importCandidateListKey } from ***REMOVED***./batch_import_state***REMOVED***

const documents = [
    {
        uuid: ***REMOVED***one***REMOVED***, slug: ***REMOVED***one***REMOVED***, label: ***REMOVED***One***REMOVED***, data: {},
        provenance: { sourceId: ***REMOVED***test***REMOVED***, externalId: ***REMOVED***one***REMOVED*** },
    },
    {
        uuid: ***REMOVED***two***REMOVED***, slug: ***REMOVED***two***REMOVED***, label: ***REMOVED***Two***REMOVED***, data: {},
        provenance: { sourceId: ***REMOVED***test***REMOVED***, externalId: ***REMOVED***two***REMOVED*** },
    },
]

describe(***REMOVED***batch import row state***REMOVED***, () => {
    it(***REMOVED***uses record identity rather than array identity to detect document changes***REMOVED***, () => {
        expect(importCandidateListKey(documents.map((document) => ({ ...document })))).toBe(
            importCandidateListKey(documents)
        )
        expect(importCandidateListKey(documents.slice(0, 1))).not.toBe(
            importCandidateListKey(documents)
        )
    })

    it(***REMOVED***initializes new records as selected and ready***REMOVED***, () => {
        expect(createImportRows(documents)).toEqual([
            { ...documents[0], selected: true, imported: false, loading: false },
            { ...documents[1], selected: true, imported: false, loading: false },
        ])
    })

    it(***REMOVED***marks successful records imported and keeps failed records selected for retry***REMOVED***, () => {
        const rows = createImportRows(documents).map((row) => ({ ...row, loading: true }))
        const results: PromiseSettledResult<void>[] = [
            { status: ***REMOVED***fulfilled***REMOVED***, value: undefined },
            { status: ***REMOVED***rejected***REMOVED***, reason: new Error(***REMOVED***Document could not be saved***REMOVED***) },
        ]

        const updated = applyBatchResults(rows, rows, results)

        expect(updated[0]).toMatchObject({ imported: true, selected: false, loading: false })
        expect(updated[1]).toMatchObject({
            imported: false,
            selected: true,
            loading: false,
            error: ***REMOVED***Document could not be saved***REMOVED***,
        })
    })

    it(***REMOVED***classifies a duplicate constraint failure for contextual recovery***REMOVED***, () => {
        const rows = createImportRows(documents)
        const updated = applyBatchResults(rows, [rows[0]], [{
            status: ***REMOVED***rejected***REMOVED***,
            reason: new Error(
                ***REMOVED***HTTP error! status: 409. duplicate key value violates unique constraint "document_type_slug_uniq"***REMOVED***
            ),
        }])

        expect(updated[0]).toMatchObject({
            selected: true,
            imported: false,
            errorKind: ***REMOVED***duplicate-type-slug***REMOVED***,
        })
        expect(updated[0].error).toContain(***REMOVED***already exists***REMOVED***)
    })
})