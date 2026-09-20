import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import { classifyImportError } from ***REMOVED***./import_errors***REMOVED***

describe(***REMOVED***classifyImportError***REMOVED***, () => {
    it(***REMOVED***recognizes the document type and slug uniqueness conflict***REMOVED***, () => {
        expect(classifyImportError(new Error(
            ***REMOVED***Error posting to Postgrest: HTTP error! status: 409. duplicate key value violates unique constraint "document_type_slug_uniq"***REMOVED***
        ))).toEqual({
            kind: ***REMOVED***duplicate-type-slug***REMOVED***,
            status: 409,
            constraint: ***REMOVED***document_type_slug_uniq***REMOVED***,
            message:
                ***REMOVED***A document with this type and identifier already exists, but it was not available during duplicate checking. It may be hidden by permissions or was created after the check.***REMOVED***,
        })
    })

    it(***REMOVED***classifies permission, validation, network, and unknown failures***REMOVED***, () => {
        expect(classifyImportError(new Error(***REMOVED***HTTP error! status: 403***REMOVED***))).toMatchObject({
            kind: ***REMOVED***forbidden***REMOVED***, status: 403,
        })
        expect(classifyImportError(new Error(***REMOVED***HTTP error! status: 422***REMOVED***))).toMatchObject({
            kind: ***REMOVED***validation***REMOVED***, status: 422,
        })
        expect(classifyImportError(new Error(***REMOVED***Failed to fetch***REMOVED***))).toMatchObject({ kind: ***REMOVED***network***REMOVED*** })
        expect(classifyImportError(new Error(***REMOVED***Something else***REMOVED***))).toEqual({
            kind: ***REMOVED***unknown***REMOVED***, status: undefined, message: ***REMOVED***Something else***REMOVED***,
        })
    })
})