import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import type { CanonicalImportRecord } from ***REMOVED***./types***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import {
    getDocumentImportProvenance,
    mergeIncomingNonEmpty,
    reconcileImportRecords,
    withImportProvenance,
} from ***REMOVED***./reconciliation***REMOVED***

const record = (externalId: string, data: unknown = { value: ***REMOVED***incoming***REMOVED*** }): CanonicalImportRecord => ({
    uuid: `transport-${externalId}`,
    slug: `record-${externalId}`,
    label: `Record ${externalId}`,
    description: ***REMOVED******REMOVED***,
    data,
    attrs: {},
    sourceData: {},
    provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId },
})

const document = (
    externalId: string,
    overrides: Partial<IDocument> = {}
): IDocument => ({
    uuid: `document-${externalId}`,
    slug: `record-${externalId}`,
    label: `Record ${externalId}`,
    description: ***REMOVED******REMOVED***,
    data: { value: ***REMOVED***incoming***REMOVED*** },
    attrs: withImportProvenance({}, { sourceId: ***REMOVED***old-source***REMOVED***, externalId }),
    object_type_uuid: ***REMOVED***type-1***REMOVED***,
    owner_sub: ***REMOVED***owner***REMOVED***,
    published: false,
    published_at: null,
    lock_sub: null,
    locked_at: null,
    subs_for_select: [],
    roles_for_select: [],
    subs_for_update: [],
    roles_for_update: [],
    created_at: ***REMOVED***2026-09-19T00:00:00Z***REMOVED***,
    updated_at: null,
    ...overrides,
})

describe(***REMOVED***import reconciliation***REMOVED***, () => {
    it(***REMOVED***persists and reads namespaced provenance***REMOVED***, () => {
        const attrs = withImportProvenance({ mime_type: ***REMOVED***application/json***REMOVED*** }, {
            sourceId: ***REMOVED***source-a***REMOVED***,
            externalId: ***REMOVED***external-1***REMOVED***,
        })

        expect(attrs.mime_type).toBe(***REMOVED***application/json***REMOVED***)
        expect(getDocumentImportProvenance({ attrs })).toEqual({
            source_id: ***REMOVED***source-a***REMOVED***,
            external_id: ***REMOVED***external-1***REMOVED***,
        })
    })

    it(***REMOVED***classifies new, exact, conflicting, and ambiguous records***REMOVED***, () => {
        const records = [record(***REMOVED***new***REMOVED***), record(***REMOVED***exact***REMOVED***), record(***REMOVED***conflict***REMOVED***), record(***REMOVED***ambiguous***REMOVED***)]
        const existing = [
            document(***REMOVED***exact***REMOVED***),
            document(***REMOVED***conflict***REMOVED***, { data: { value: ***REMOVED***existing***REMOVED*** } }),
            document(***REMOVED***ambiguous***REMOVED***),
            document(***REMOVED***ambiguous***REMOVED***, { uuid: ***REMOVED***document-ambiguous-2***REMOVED*** }),
        ]

        expect(reconcileImportRecords(records, existing).map(({ status, action }) => ({ status, action })))
            .toEqual([
                { status: ***REMOVED***new***REMOVED***, action: ***REMOVED***create***REMOVED*** },
                { status: ***REMOVED***exact***REMOVED***, action: ***REMOVED***ignore***REMOVED*** },
                { status: ***REMOVED***conflicting***REMOVED***, action: ***REMOVED***ignore***REMOVED*** },
                { status: ***REMOVED***ambiguous***REMOVED***, action: undefined },
            ])
    })

    it(***REMOVED***finds a legacy document by slug when import provenance is missing***REMOVED***, () => {
        const incoming = record(***REMOVED***legacy***REMOVED***, { value: ***REMOVED***incoming***REMOVED*** })
        const legacy = document(***REMOVED***legacy***REMOVED***, {
            attrs: {},
            data: { value: ***REMOVED***existing***REMOVED*** },
        })

        expect(reconcileImportRecords([incoming], [legacy])[0]).toMatchObject({
            status: ***REMOVED***conflicting***REMOVED***,
            action: ***REMOVED***ignore***REMOVED***,
            existingDocuments: [legacy],
        })
    })

    it(***REMOVED***blocks duplicate incoming slugs before either record can be created***REMOVED***, () => {
        const first = record(***REMOVED***first***REMOVED***)
        const second = { ...record(***REMOVED***second***REMOVED***), slug: first.slug }

        const reconciliations = reconcileImportRecords([first, second], [])

        expect(reconciliations.map(({ status, action }) => ({ status, action }))).toEqual([
            { status: ***REMOVED***ambiguous***REMOVED***, action: undefined },
            { status: ***REMOVED***ambiguous***REMOVED***, action: undefined },
        ])
    })

    it(***REMOVED***deep merges with incoming non-empty values winning***REMOVED***, () => {
        expect(mergeIncomingNonEmpty(
            {
                name: ***REMOVED***existing***REMOVED***,
                nested: { keep: ***REMOVED***yes***REMOVED***, replace: 1, preserve: ***REMOVED***value***REMOVED*** },
                array: [***REMOVED***existing***REMOVED***],
                enabled: true,
            },
            {
                name: ***REMOVED******REMOVED***,
                nested: { replace: 2, preserve: null, add: ***REMOVED***new***REMOVED*** },
                array: [***REMOVED***incoming***REMOVED***],
                enabled: false,
            }
        )).toEqual({
            name: ***REMOVED***existing***REMOVED***,
            nested: { keep: ***REMOVED***yes***REMOVED***, replace: 2, preserve: ***REMOVED***value***REMOVED***, add: ***REMOVED***new***REMOVED*** },
            array: [***REMOVED***incoming***REMOVED***],
            enabled: false,
        })
    })

    it(***REMOVED***preserves existing values for empty input but accepts zero and false***REMOVED***, () => {
        expect(mergeIncomingNonEmpty(
            {
                emptyArray: [***REMOVED***existing***REMOVED***],
                emptyObject: { keep: true },
                missing: ***REMOVED***existing***REMOVED***,
                count: 4,
                enabled: true,
            },
            {
                emptyArray: [],
                emptyObject: {},
                count: 0,
                enabled: false,
            }
        )).toEqual({
            emptyArray: [***REMOVED***existing***REMOVED***],
            emptyObject: { keep: true },
            missing: ***REMOVED***existing***REMOVED***,
            count: 0,
            enabled: false,
        })
    })
})