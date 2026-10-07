import { describe, expect, it } from 'vitest'
import {
    clearCSVRelationshipRule,
    getUniqueCSVRelationshipRules,
    mirrorCSVRelationshipRule,
    resolveCSVRelationshipRules,
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

    it('resolves each cascade rule against matching document types and excludes array sources', () => {
        const projectToSite: ImportRelationshipRule = {
            parentObjectTypeSlug: 'pam_project',
            childObjectTypeSlug: 'pam_site',
            parentMatchField: 'project',
            childMatchField: 'project',
            predicate: 'has_parent',
        }
        const siteToDeployment: ImportRelationshipRule = {
            parentObjectTypeSlug: 'pam_site',
            childObjectTypeSlug: 'pam_deployment',
            parentMatchField: 'siteOrCruiseName',
            childMatchField: 'site',
            predicate: 'has_parent',
        }
        const sources = [
            {
                sourceId: 'project',
                typeSlug: 'pam_project',
                role: 'parent' as const,
                relationshipFields: ['project'],
                adapter: { relationshipRules: [projectToSite, siteToDeployment] },
            },
            {
                sourceId: 'site',
                typeSlug: 'pam_site',
                role: 'child' as const,
                relationshipFields: ['project', 'siteOrCruiseName'],
                adapter: { relationshipRules: [projectToSite, siteToDeployment] },
            },
            {
                sourceId: 'deployment',
                typeSlug: 'pam_deployment',
                role: 'child' as const,
                relationshipFields: ['site', 'deploymentTitle'],
                adapter: { relationshipRules: [projectToSite, siteToDeployment] },
            },
            {
                sourceId: 'recordings',
                typeSlug: 'pam_deployment',
                role: 'array' as const,
                relationshipFields: ['deploymentTitle'],
                adapter: { relationshipRules: [projectToSite, siteToDeployment] },
            },
        ]

        expect(resolveCSVRelationshipRules(sources, (source) => source.typeSlug)).toEqual([
            projectToSite,
            siteToDeployment,
        ])
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