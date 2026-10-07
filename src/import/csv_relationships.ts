import type { ImportRelationshipRule } from './types'

type CSVRelationshipSource = {
    sourceId: string
    typeSlug: string
    role: 'standalone' | 'parent' | 'child' | 'array'
    relationshipRule?: ImportRelationshipRule
    relationshipFields: string[]
    config?: { relationshipFields?: string[] }
    adapter?: { relationshipRules?: ImportRelationshipRule[] }
}

export const mirrorCSVRelationshipRule = <T extends CSVRelationshipSource>(
    sources: T[],
    rule: ImportRelationshipRule
): T[] => {
    const parent = sources.find((source) => source.typeSlug === rule.parentObjectTypeSlug)
    const child = sources.find((source) => source.typeSlug === rule.childObjectTypeSlug)
    if (!parent || !child || parent.sourceId === child.sourceId) return sources

    return sources.map((source) => {
        const matchField = source.sourceId === parent.sourceId
            ? rule.parentMatchField
            : source.sourceId === child.sourceId
                ? rule.childMatchField
                : undefined
        if (matchField === undefined) return source
        return {
            ...source,
            role: source.sourceId === parent.sourceId ? 'parent' : 'child',
            relationshipRule: rule,
            relationshipFields: matchField && !source.relationshipFields.includes(matchField)
                ? [...source.relationshipFields, matchField]
                : source.relationshipFields,
        } as T
    })
}

export const clearCSVRelationshipRule = <T extends CSVRelationshipSource>(
    sources: T[],
    parentSourceId: string,
    childSourceId?: string,
    remainingRules?: ImportRelationshipRule[]
): T[] => sources.map((source) => {
    if (source.sourceId !== parentSourceId && source.sourceId !== childSourceId) return source
    return {
        ...source,
        role: source.sourceId === childSourceId ? 'standalone' : source.role,
        relationshipRule: undefined,
        relationshipFields: source.config?.relationshipFields ?? [],
        adapter: source.adapter
            ? { ...source.adapter, relationshipRules: remainingRules }
            : source.adapter,
    } as T
})

export const getUniqueCSVRelationshipRules = (
    sources: Array<{
        relationshipRule?: ImportRelationshipRule
        adapter?: { relationshipRules?: ImportRelationshipRule[] }
    }>
): ImportRelationshipRule[] => {
    const rules = sources.flatMap((source) =>
        source.relationshipRule
            ? [source.relationshipRule]
            : source.adapter?.relationshipRules ?? []
    )
    return rules.filter((rule, index, allRules) =>
        allRules.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(rule)) === index
    )
}

export const resolveCSVRelationshipRules = <T extends CSVRelationshipSource>(
    sources: T[],
    resolveTypeSlug: (source: T) => string | undefined
): ImportRelationshipRule[] => {
    const documentSources = sources.filter((source) => source.role !== 'array')
    return getUniqueCSVRelationshipRules(documentSources).map((rule) => {
        const parentSource = documentSources.find(
            (source) => source.typeSlug === rule.parentObjectTypeSlug
        )
        const childSource = documentSources.find(
            (source) => source.typeSlug === rule.childObjectTypeSlug
        )
        return {
            ...rule,
            parentObjectTypeSlug: parentSource
                ? resolveTypeSlug(parentSource) ?? rule.parentObjectTypeSlug
                : rule.parentObjectTypeSlug,
            childObjectTypeSlug: childSource
                ? resolveTypeSlug(childSource) ?? rule.childObjectTypeSlug
                : rule.childObjectTypeSlug,
        }
    })
}