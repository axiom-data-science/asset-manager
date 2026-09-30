import { describe, expect, it } from 'vitest'
import {
    clearCSVRelationshipRule,
    getUniqueCSVRelationshipRules,
    mirrorCSVRelationshipRule,
} from './csv_relationships'
import type { ImportRelationshipRule } from './types'

const rule: ImportRelationshipRule = {
    parentObjectTypeSlug: 'test_relationship_parents',
    childObjectTypeSlug: 'test_relationship_children',
    parentMatchField: 'parent_code',
    childMatchField: 'parent_code',
    predicate: 'has_parent',
}

describe('CSV relationship setup', () => {
    it('mirrors lookup fields and the relationship rule to both sources', () => {
        const sources = [
            {
                sourceId: 'parents-1',
                typeSlug: rule.parentObjectTypeSlug,
                role: 'standalone' as const,
                relationshipFields: ['existing_parent_field'],
            },
            {
                sourceId: 'children-2',
                typeSlug: rule.childObjectTypeSlug,
                role: 'standalone' as const,
                relationshipFields: [],
            },
            {
                sourceId: 'unrelated-3',
                typeSlug: 'unrelated',
                role: 'standalone' as const,
                relationshipFields: [],
            },
        ]

        const updated = mirrorCSVRelationshipRule(sources, rule)

        expect(updated).toMatchObject([
            {
                role: 'parent',
                relationshipRule: rule,
                relationshipFields: ['existing_parent_field', 'parent_code'],
            },
            {
                role: 'child',
                relationshipRule: rule,
                relationshipFields: ['parent_code'],
            },
            { role: 'standalone' },
        ])
    })

    it('deduplicates mirrored rules in diagnostics', () => {
        const mirroredSources = [
            { relationshipRule: rule, adapter: {} },
            { relationshipRule: { ...rule }, adapter: {} },
        ]

        expect(getUniqueCSVRelationshipRules(mirroredSources)).toEqual([rule])
    })

    it('clears both mirrored rules and restores configured relationship fields', () => {
        const sources = [
            {
                sourceId: 'parents-1',
                typeSlug: rule.parentObjectTypeSlug,
                role: 'parent' as const,
                relationshipRule: rule,
                relationshipFields: ['configured_parent_field', 'parent_code'],
                config: { relationshipFields: ['configured_parent_field'] },
                adapter: { relationshipRules: [rule] },
            },
            {
                sourceId: 'children-2',
                typeSlug: rule.childObjectTypeSlug,
                role: 'child' as const,
                relationshipRule: rule,
                relationshipFields: ['parent_code'],
                config: { relationshipFields: [] },
                adapter: { relationshipRules: [rule] },
            },
        ]

        const cleared = clearCSVRelationshipRule(sources, 'parents-1', 'children-2')

        expect(cleared).toMatchObject([
            {
                role: 'parent',
                relationshipRule: undefined,
                relationshipFields: ['configured_parent_field'],
            },
            {
                role: 'standalone',
                relationshipRule: undefined,
                relationshipFields: [],
            },
        ])
        expect(getUniqueCSVRelationshipRules(cleared)).toEqual([])
    })
})