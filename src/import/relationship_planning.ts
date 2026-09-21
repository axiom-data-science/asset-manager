import type {
    CanonicalImportRecord,
} from ***REMOVED***./types***REMOVED***
import type { ImportRelationshipRule } from ***REMOVED***./types***REMOVED***
import type {
    IHydratedExpectedChildType,
    IObjectType,
} from ***REMOVED***@/types/types***REMOVED***

export type ImportRelationshipStatus = ***REMOVED***ready***REMOVED*** | ***REMOVED***missing-parent***REMOVED*** | ***REMOVED***ambiguous-parent***REMOVED*** | ***REMOVED***invalid-rule***REMOVED***

export type ImportRelationshipPersistenceResult = {
    relationshipKey: string
    status: ***REMOVED***created***REMOVED*** | ***REMOVED***existing***REMOVED*** | ***REMOVED***blocked***REMOVED*** | ***REMOVED***failed***REMOVED***
    error?: string
}

export type ImportRelationshipCandidate = {
    record: CanonicalImportRecord
    objectTypeUuid: string
    objectTypeSlug: string
}

export type ImportRelationshipPlan = {
    parent?: ImportRelationshipCandidate
    child: ImportRelationshipCandidate
    predicate: string
    status: ImportRelationshipStatus
    reason?: string
}

type RelationshipRule = IHydratedExpectedChildType & {
    object_type_uuid?: string
    parentMatchField?: string
    childMatchField?: string
}

const readPath = (value: unknown, path?: string): unknown => {
    if (!path) return undefined
    return path.split(***REMOVED***.***REMOVED***).reduce<unknown>((current, key) => {
        if (current === null || typeof current !== ***REMOVED***object***REMOVED***) return undefined
        return (current as Record<string, unknown>)[key]
    }, value)
}

const identity = (candidate: ImportRelationshipCandidate, field?: string): string => {
    const fieldValue = readPath(candidate.record.data, field)
    if (typeof fieldValue === ***REMOVED***string***REMOVED*** && fieldValue.length > 0) return fieldValue
    return `${candidate.record.provenance.sourceId}:${candidate.record.provenance.externalId}`
}

const matchesRule = (child: ImportRelationshipCandidate, rule: RelationshipRule): boolean =>
    (rule.object_type_uuid !== undefined && child.objectTypeUuid === rule.object_type_uuid) ||
    (rule.object_type_slug !== undefined && child.objectTypeSlug === rule.object_type_slug)

const rulesFor = (objectType: IObjectType): RelationshipRule[] =>
    (objectType.data?.expected_child_types ?? []) as RelationshipRule[]

export const planImportRelationships = ({
    parentObjectTypes,
    candidates,
    relationshipRules = [],
}: {
    parentObjectTypes: Map<string, IObjectType>
    candidates: ImportRelationshipCandidate[]
    relationshipRules?: ImportRelationshipRule[]
}): ImportRelationshipPlan[] => {
    const plans: ImportRelationshipPlan[] = []
    for (const [parentObjectTypeUuid, objectType] of parentObjectTypes) {
        const parents = candidates.filter((candidate) => candidate.objectTypeUuid === parentObjectTypeUuid)
        const configuredRules = relationshipRules
            .filter((candidate) => candidate.parentObjectTypeSlug === objectType.slug)
            .map((candidate) => ({
                object_type_slug: candidate.childObjectTypeSlug,
                parentMatchField: candidate.parentMatchField,
                childMatchField: candidate.childMatchField,
                to_parent_predicate: candidate.predicate,
            }))
        const rules = [...rulesFor(objectType), ...configuredRules]
        for (const rule of rules) {
            const children = candidates.filter((candidate) => matchesRule(candidate, rule))
            if (children.length === 0) continue
            const sourceRule = relationshipRules.find((candidate) =>
                candidate.parentObjectTypeSlug === objectType.slug &&
                candidate.childObjectTypeSlug === children[0].objectTypeSlug
            )
            const predicate = sourceRule?.predicate ?? rule.to_parent_predicate
            const parentMatchField = sourceRule?.parentMatchField ?? rule.parentMatchField
            const childMatchField = sourceRule?.childMatchField ?? rule.childMatchField
            if (!predicate) {
                plans.push({
                    parent: parents[0],
                    child: children[0],
                    predicate: ***REMOVED******REMOVED***,
                    status: ***REMOVED***invalid-rule***REMOVED***,
                    reason: ***REMOVED***Relationship rule is missing to_parent_predicate***REMOVED***,
                })
                continue
            }
            for (const child of children) {
                const childIdentity = identity(child, childMatchField)
                const matchingParents = parents.filter((candidate) =>
                    identity(candidate, parentMatchField) === childIdentity
                )
                if (matchingParents.length === 0) {
                    plans.push({
                        parent: parents[0],
                        child,
                        predicate,
                        status: ***REMOVED***missing-parent***REMOVED***,
                        reason: `No parent match for child identity ${childIdentity}`,
                    })
                    continue
                }
                plans.push({
                    parent: matchingParents[0],
                    child,
                    predicate,
                    status: matchingParents.length > 1 ? ***REMOVED***ambiguous-parent***REMOVED*** : ***REMOVED***ready***REMOVED***,
                    reason: matchingParents.length > 1
                        ? `Multiple parents match child identity ${childIdentity}`
                        : undefined,
                })
            }
        }
    }
    return plans
}

export const importRelationshipKey = (plan: ImportRelationshipPlan): string =>
    `${relationshipDocumentKey(plan.child)}:${plan.predicate}`

export const relationshipDocumentKey = (candidate: ImportRelationshipCandidate): string =>
    `${candidate.objectTypeUuid}:${candidate.record.provenance.sourceId}:${candidate.record.provenance.externalId}`

export const persistImportRelationships = async ({
    plans,
    documentUuids,
    predicateUuids,
    signal,
    post,
    findExisting,
}: {
    plans: ImportRelationshipPlan[]
    documentUuids: ReadonlyMap<string, string>
    predicateUuids: ReadonlyMap<string, string>
    signal: AbortSignal
    post: (relationship: {
        from_document_uuid: string
        to_document_uuid: string
        predicate_uuid: string
    }, signal: AbortSignal) => Promise<unknown>
    findExisting?: (relationship: {
        from_document_uuid: string
        to_document_uuid: string
        predicate_uuid: string
    }, signal: AbortSignal) => Promise<boolean>
}): Promise<ImportRelationshipPersistenceResult[]> => {
    const results: ImportRelationshipPersistenceResult[] = []
    for (const plan of plans) {
        const relationshipKey = importRelationshipKey(plan)
        if (signal.aborted) throw new DOMException(***REMOVED***Relationship persistence cancelled***REMOVED***, ***REMOVED***AbortError***REMOVED***)
        if (plan.status !== ***REMOVED***ready***REMOVED*** || !plan.parent) {
            results.push({ relationshipKey, status: ***REMOVED***blocked***REMOVED***, error: plan.reason })
            continue
        }
        const childUuid = documentUuids.get(relationshipDocumentKey(plan.child))
        const parentUuid = documentUuids.get(relationshipDocumentKey(plan.parent))
        const predicateUuid = predicateUuids.get(plan.predicate)
        if (!childUuid || !parentUuid || !predicateUuid) {
            results.push({ relationshipKey, status: ***REMOVED***blocked***REMOVED***, error: ***REMOVED***Document or predicate UUID is unavailable***REMOVED*** })
            continue
        }
        const relationship = {
            from_document_uuid: childUuid,
            to_document_uuid: parentUuid,
            predicate_uuid: predicateUuid,
        }
        try {
            if (findExisting && await findExisting(relationship, signal)) {
                results.push({ relationshipKey, status: ***REMOVED***existing***REMOVED*** })
                continue
            }
            await post(relationship, signal)
            results.push({ relationshipKey, status: ***REMOVED***created***REMOVED*** })
        } catch (error) {
            results.push({
                relationshipKey,
                status: ***REMOVED***failed***REMOVED***,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
    return results
}