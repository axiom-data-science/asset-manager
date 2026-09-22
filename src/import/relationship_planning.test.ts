import { describe, expect, it, vi } from 'vitest'
import type { IObjectType } from '@/types/types'
import type { CanonicalImportRecord } from './types'
import {
    persistImportRelationships,
    importRelationshipKey,
    planImportRelationships,
    relationshipDocumentKey,
    type ImportRelationshipCandidate,
} from './relationship_planning'

const objectType = (uuid: string, slug: string, expectedChildTypes: Record<string, unknown>[]): IObjectType => ({
    uuid,
    slug,
    owner_sub: 'owner',
    label: slug,
    category: 'document',
    created_at: '',
    updated_at: '',
    data: { expected_child_types: expectedChildTypes },
})

const candidate = (
    sourceId: string,
    externalId: string,
    objectTypeUuid: string,
    objectTypeSlug: string,
    data: Record<string, unknown> = {}
): ImportRelationshipCandidate => ({
    objectTypeUuid,
    objectTypeSlug,
    record: {
        uuid: externalId,
        slug: externalId,
        label: externalId,
        description: '',
        data,
        attrs: {},
        sourceData: data,
        provenance: { sourceId, externalId },
    } as CanonicalImportRecord,
})

describe('Import relationship planning', () => {
    it('plans a relationship using provenance identity by default', () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const child = candidate('source', 'parent-1', 'child-type', 'children')

        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, child],
        })

        expect(plans).toMatchObject([{
            parent: { record: { provenance: { externalId: 'parent-1' } } },
            child: { record: { provenance: { externalId: 'parent-1' } } },
            predicate: 'belongs_to',
            status: 'ready',
        }])
    })

    it('reports missing and ambiguous parents', () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const duplicateParent = candidate('source', 'parent-1', 'parent-type', 'parents', { key: 'same' })
        const missingChild = candidate('source', 'missing', 'child-type', 'children')
        const ambiguousChild = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, duplicateParent, missingChild, ambiguousChild],
        })

        expect(plans.map(({ status }) => status)).toEqual([
            'missing-parent',
            'ambiguous-parent',
        ])
    })

    it('uses configured data paths for parent and child matching', () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents', { code: 'A-1' })
        const child = candidate('source', 'child-1', 'child-type', 'children', { parentCode: 'A-1' })
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [])],
            ]),
            candidates: [parent, child],
            relationshipRules: [{
                parentObjectTypeSlug: 'parents',
                childObjectTypeSlug: 'children',
                parentMatchField: 'code',
                childMatchField: 'parentCode',
                predicate: 'belongs_to',
            }],
        })

        expect(plans[0]).toMatchObject({ status: 'ready', predicate: 'belongs_to' })
    })

    it('matches configured identities when payload fields are numbers', () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents', { id: 17 })
        const child = candidate('source', 'child-1', 'child-type', 'children', { parentId: 17 })
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [])],
            ]),
            candidates: [parent, child],
            relationshipRules: [{
                parentObjectTypeSlug: 'parents',
                childObjectTypeSlug: 'children',
                parentMatchField: 'id',
                childMatchField: 'parentId',
                predicate: 'belongs_to',
            }],
        })

        expect(plans[0]).toMatchObject({ status: 'ready', predicate: 'belongs_to' })
    })

    it('reports a missing parent when only child records are imported', () => {
        const child = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [child],
        })

        expect(plans[0]).toMatchObject({ status: 'missing-parent', child })
        expect(plans[0].parent).toBeUndefined()
    })

    it('persists only ready relationships from child to parent', async () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const child = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, child],
        })
        const post = vi.fn().mockResolvedValue({ uuid: 'relationship-1' })
        const results = await persistImportRelationships({
            plans,
            documentUuids: new Map([
                [relationshipDocumentKey(parent), 'parent-document'],
                [relationshipDocumentKey(child), 'child-document'],
            ]),
            predicateUuids: new Map([['belongs_to', 'predicate-1']]),
            signal: new AbortController().signal,
            post,
        })

        expect(results).toEqual([{ relationshipKey: 'child-type:source:parent-1:belongs_to', status: 'created' }])
        expect(post).toHaveBeenCalledWith({
            from_document_uuid: 'child-document',
            to_document_uuid: 'parent-document',
            predicate_uuid: 'predicate-1',
        }, expect.any(AbortSignal))
    })

    it('allows a failed relationship to be retried without changing the plan', async () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const child = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, child],
        })
        let attempts = 0
        const post = vi.fn(async () => {
            attempts += 1
            if (attempts === 1) throw new Error('temporary failure')
            return { uuid: 'relationship-1' }
        })
        const options = {
            plans,
            documentUuids: new Map([
                [relationshipDocumentKey(parent), 'parent-document'],
                [relationshipDocumentKey(child), 'child-document'],
            ]),
            predicateUuids: new Map([['belongs_to', 'predicate-1']]),
            signal: new AbortController().signal,
            post,
        }

        const first = await persistImportRelationships(options)
        const retry = await persistImportRelationships({
            ...options, plans: plans.filter((plan) =>
                first.some((result) => result.status === 'failed' && result.relationshipKey === importRelationshipKey(plan))
            )
        })

        expect(first[0]).toMatchObject({ status: 'failed' })
        expect(retry[0]).toMatchObject({ status: 'created' })
        expect(post).toHaveBeenCalledTimes(2)
    })

    it('does not post a relationship that already exists', async () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const child = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, child],
        })
        const post = vi.fn()
        const findExisting = vi.fn().mockResolvedValue(true)
        const results = await persistImportRelationships({
            plans,
            documentUuids: new Map([
                [relationshipDocumentKey(parent), 'parent-document'],
                [relationshipDocumentKey(child), 'child-document'],
            ]),
            predicateUuids: new Map([['belongs_to', 'predicate-1']]),
            signal: new AbortController().signal,
            post,
            findExisting,
        })

        expect(results).toEqual([{ relationshipKey: 'child-type:source:parent-1:belongs_to', status: 'existing' }])
        expect(post).not.toHaveBeenCalled()
    })

    it('reports which relationship UUID is unavailable', async () => {
        const parent = candidate('source', 'parent-1', 'parent-type', 'parents')
        const child = candidate('source', 'parent-1', 'child-type', 'children')
        const plans = planImportRelationships({
            parentObjectTypes: new Map([
                ['parent-type', objectType('parent-type', 'parents', [{
                    object_type_slug: 'children',
                    to_parent_predicate: 'belongs_to',
                }])],
            ]),
            candidates: [parent, child],
        })

        const results = await persistImportRelationships({
            plans,
            documentUuids: new Map(),
            predicateUuids: new Map([['belongs_to', 'predicate-1']]),
            signal: new AbortController().signal,
            post: vi.fn(),
        })

        expect(results).toEqual([{
            relationshipKey: 'child-type:source:parent-1:belongs_to',
            status: 'blocked',
            error: 'UUID unavailable for child document, parent document',
        }])
    })
})