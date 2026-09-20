import { describe, expect, it } from 'vitest'
import type { CanonicalImportRecord } from './types'
import type { IDocument } from '@/types/types'
import {
    getDocumentImportProvenance,
    mergeIncomingNonEmpty,
    reconcileImportRecords,
    withImportProvenance,
} from './reconciliation'

const record = (externalId: string, data: unknown = { value: 'incoming' }): CanonicalImportRecord => ({
    uuid: `transport-${externalId}`,
    slug: `record-${externalId}`,
    label: `Record ${externalId}`,
    description: '',
    data,
    attrs: {},
    sourceData: {},
    provenance: { sourceId: 'source-a', externalId },
})

const document = (
    externalId: string,
    overrides: Partial<IDocument> = {}
): IDocument => ({
    uuid: `document-${externalId}`,
    slug: `record-${externalId}`,
    label: `Record ${externalId}`,
    description: '',
    data: { value: 'incoming' },
    attrs: withImportProvenance({}, { sourceId: 'old-source', externalId }),
    object_type_uuid: 'type-1',
    owner_sub: 'owner',
    published: false,
    published_at: null,
    lock_sub: null,
    locked_at: null,
    subs_for_select: [],
    roles_for_select: [],
    subs_for_update: [],
    roles_for_update: [],
    created_at: '2026-09-19T00:00:00Z',
    updated_at: null,
    ...overrides,
})

describe('import reconciliation', () => {
    it('persists and reads namespaced provenance', () => {
        const attrs = withImportProvenance({ mime_type: 'application/json' }, {
            sourceId: 'source-a',
            externalId: 'external-1',
        })

        expect(attrs.mime_type).toBe('application/json')
        expect(getDocumentImportProvenance({ attrs })).toEqual({
            source_id: 'source-a',
            external_id: 'external-1',
        })
    })

    it('classifies new, exact, conflicting, and ambiguous records', () => {
        const records = [record('new'), record('exact'), record('conflict'), record('ambiguous')]
        const existing = [
            document('exact'),
            document('conflict', { data: { value: 'existing' } }),
            document('ambiguous'),
            document('ambiguous', { uuid: 'document-ambiguous-2' }),
        ]

        expect(reconcileImportRecords(records, existing).map(({ status, action }) => ({ status, action })))
            .toEqual([
                { status: 'new', action: 'create' },
                { status: 'exact', action: 'ignore' },
                { status: 'conflicting', action: 'ignore' },
                { status: 'ambiguous', action: undefined },
            ])
    })

    it('finds a legacy document by slug when import provenance is missing', () => {
        const incoming = record('legacy', { value: 'incoming' })
        const legacy = document('legacy', {
            attrs: {},
            data: { value: 'existing' },
        })

        expect(reconcileImportRecords([incoming], [legacy])[0]).toMatchObject({
            status: 'conflicting',
            action: 'ignore',
            existingDocuments: [legacy],
        })
    })

    it('blocks duplicate incoming slugs before either record can be created', () => {
        const first = record('first')
        const second = { ...record('second'), slug: first.slug }

        const reconciliations = reconcileImportRecords([first, second], [])

        expect(reconciliations.map(({ status, action }) => ({ status, action }))).toEqual([
            { status: 'ambiguous', action: undefined },
            { status: 'ambiguous', action: undefined },
        ])
    })

    it('deep merges with incoming non-empty values winning', () => {
        expect(mergeIncomingNonEmpty(
            {
                name: 'existing',
                nested: { keep: 'yes', replace: 1, preserve: 'value' },
                array: ['existing'],
                enabled: true,
            },
            {
                name: '',
                nested: { replace: 2, preserve: null, add: 'new' },
                array: ['incoming'],
                enabled: false,
            }
        )).toEqual({
            name: 'existing',
            nested: { keep: 'yes', replace: 2, preserve: 'value', add: 'new' },
            array: ['incoming'],
            enabled: false,
        })
    })

    it('preserves existing values for empty input but accepts zero and false', () => {
        expect(mergeIncomingNonEmpty(
            {
                emptyArray: ['existing'],
                emptyObject: { keep: true },
                missing: 'existing',
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
            emptyArray: ['existing'],
            emptyObject: { keep: true },
            missing: 'existing',
            count: 0,
            enabled: false,
        })
    })
})