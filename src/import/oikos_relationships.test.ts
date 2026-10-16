import { describe, expect, it } from 'vitest'
import type { CanonicalImportRecord, ImportRelationshipRule } from './types'
import { planImportRelationships, type ImportRelationshipCandidate } from './relationship_planning'

const oikosModelRule: ImportRelationshipRule = {
    parentObjectTypeSlug: 'oikos_model',
    childObjectTypeSlug: 'oikos_model_variable',
    parentMatchField: 'slug',
    childMatchField: 'modelSlug',
    predicate: 'has_parent',
}

const oikosModuleRule: ImportRelationshipRule = {
    parentObjectTypeSlug: 'oikos_vector_module',
    childObjectTypeSlug: 'oikos_vector_layer_group',
    parentMatchField: 'uuid',
    childMatchField: 'module_uuid',
    predicate: 'has_parent',
}

const oikosLayerGroupRule: ImportRelationshipRule = {
    parentObjectTypeSlug: 'oikos_vector_layer_group',
    childObjectTypeSlug: 'oikos_vector_layer',
    parentMatchField: 'id',
    childMatchField: 'layer_group_id',
    predicate: 'has_parent',
}

const candidate = (
    sourceId: string,
    externalId: string,
    objectTypeUuid: string,
    objectTypeSlug: string,
    data: Record<string, unknown>,
    recordSlug = externalId
): ImportRelationshipCandidate => ({
    objectTypeUuid,
    objectTypeSlug,
    record: {
        uuid: externalId,
        slug: recordSlug,
        label: externalId,
        description: '',
        data,
        attrs: {},
        sourceData: data,
        provenance: { sourceId, externalId },
    } as CanonicalImportRecord,
})

const objectType = (uuid: string, slug: string) => ({
    uuid,
    slug,
    owner_sub: 'owner',
    label: slug,
    category: 'document' as const,
    created_at: '',
    updated_at: '',
    data: {},
})

describe('Oikos relationship rules', () => {
    it('matches model variables to models by model slug', () => {
        const parent = candidate('oikos', 'model-1', 'model-type', 'oikos_model', {
            slug: 'forecast-model',
        }, 'forecast-model')
        const child = candidate('oikos', 'variable-1', 'variable-type', 'oikos_model_variable', {
            modelSlug: 'forecast-model',
        })

        const plans = planImportRelationships({
            parentObjectTypes: new Map([['model-type', objectType('model-type', 'oikos_model')]]),
            candidates: [parent, child],
            relationshipRules: [oikosModelRule],
        })

        expect(plans).toMatchObject([
            { status: 'ready', predicate: 'has_parent', parent, child },
        ])
    })

    it('matches layer groups to modules and layers to layer groups', () => {
        const module = candidate('oikos', 'module-1', 'module-type', 'oikos_vector_module', {
            uuid: 'module-1',
        })
        const layerGroup = candidate('oikos', 'group-17', 'group-type', 'oikos_vector_layer_group', {
            module_uuid: 'module-1',
            id: 17,
        })
        const layer = candidate('oikos', 'layer-1', 'layer-type', 'oikos_vector_layer', {
            layer_group_id: '17',
        })

        const modulePlans = planImportRelationships({
            parentObjectTypes: new Map([['module-type', objectType('module-type', 'oikos_vector_module')]]),
            candidates: [module, layerGroup],
            relationshipRules: [oikosModuleRule],
        })
        const layerPlans = planImportRelationships({
            parentObjectTypes: new Map([
                ['group-type', objectType('group-type', 'oikos_vector_layer_group')],
            ]),
            candidates: [layerGroup, layer],
            relationshipRules: [oikosLayerGroupRule],
        })

        expect(modulePlans).toMatchObject([
            { status: 'ready', predicate: 'has_parent', parent: module, child: layerGroup },
        ])
        expect(layerPlans).toMatchObject([
            { status: 'ready', predicate: 'has_parent', parent: layerGroup, child: layer },
        ])
    })

    it('blocks duplicate module identities as ambiguous parents', () => {
        const module = candidate('oikos', 'module-1', 'module-type', 'oikos_vector_module', {
            uuid: 'module-1',
        })
        const duplicateModule = candidate('oikos', 'module-1-copy', 'module-type', 'oikos_vector_module', {
            uuid: 'module-1',
        })
        const layerGroup = candidate('oikos', 'group-17', 'group-type', 'oikos_vector_layer_group', {
            module_uuid: 'module-1',
        })

        const plans = planImportRelationships({
            parentObjectTypes: new Map([['module-type', objectType('module-type', 'oikos_vector_module')]]),
            candidates: [module, duplicateModule, layerGroup],
            relationshipRules: [oikosModuleRule],
        })

        expect(plans).toMatchObject([
            { status: 'ambiguous-parent', predicate: 'has_parent', child: layerGroup },
        ])
    })
})
