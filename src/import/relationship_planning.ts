import type { CanonicalImportRecord } from './types'
import type { ImportRelationshipRule } from './types'
import type { IHydratedExpectedChildType, IObjectType } from '@/types/types'

export type ImportRelationshipStatus =
  'ready' | 'missing-parent' | 'ambiguous-parent' | 'invalid-rule'

export type ImportRelationshipPersistenceResult = {
  relationshipKey: string
  status: 'created' | 'existing' | 'blocked' | 'failed'
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
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

const identity = (candidate: ImportRelationshipCandidate, field?: string): string => {
  const fieldValue = readPath(candidate.record.data, field)
  if (typeof fieldValue === 'string' && fieldValue.length > 0) return fieldValue
  if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return String(fieldValue)
  return `${candidate.record.provenance.sourceId}:${candidate.record.provenance.externalId}`
}

const matchesRule = (child: ImportRelationshipCandidate, rule: RelationshipRule): boolean =>
  (rule.object_type_uuid !== undefined && child.objectTypeUuid === rule.object_type_uuid) ||
  (rule.object_type_slug !== undefined && child.objectTypeSlug === rule.object_type_slug)

const rulesFor = (objectType: IObjectType): RelationshipRule[] =>
  (objectType.data?.expected_child_types ?? []) as RelationshipRule[]

const relationshipRuleKey = (rule: RelationshipRule): string =>
  JSON.stringify({
    object_type_uuid: rule.object_type_uuid,
    object_type_slug: rule.object_type_slug,
    parentMatchField: rule.parentMatchField,
    childMatchField: rule.childMatchField,
    to_parent_predicate: rule.to_parent_predicate,
  })

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
    const parents = candidates.filter(
      (candidate) => candidate.objectTypeUuid === parentObjectTypeUuid
    )
    const configuredRules = relationshipRules
      .filter((candidate) => candidate.parentObjectTypeSlug === objectType.slug)
      .map((candidate) => ({
        object_type_slug: candidate.childObjectTypeSlug,
        parentMatchField: candidate.parentMatchField,
        childMatchField: candidate.childMatchField,
        to_parent_predicate: candidate.predicate,
      }))
    const rules = [...rulesFor(objectType), ...configuredRules].filter(
      (rule, index, allRules) =>
        allRules.findIndex(
          (candidate) => relationshipRuleKey(candidate) === relationshipRuleKey(rule)
        ) === index
    )
    for (const rule of rules) {
      const children = candidates.filter((candidate) => matchesRule(candidate, rule))
      if (children.length === 0) continue
      const sourceRule = relationshipRules.find(
        (candidate) =>
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
          predicate: '',
          status: 'invalid-rule',
          reason: 'Relationship rule is missing to_parent_predicate',
        })
        continue
      }
      for (const child of children) {
        const childIdentity = identity(child, childMatchField)
        const matchingParents = parents.filter(
          (candidate) => identity(candidate, parentMatchField) === childIdentity
        )
        if (matchingParents.length === 0) {
          plans.push({
            parent: parents[0],
            child,
            predicate,
            status: 'missing-parent',
            reason: `No parent match for child identity ${childIdentity}`,
          })
          continue
        }
        plans.push({
          parent: matchingParents[0],
          child,
          predicate,
          status: matchingParents.length > 1 ? 'ambiguous-parent' : 'ready',
          reason:
            matchingParents.length > 1
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
  post: (
    relationship: {
      from_document_uuid: string
      to_document_uuid: string
      predicate_uuid: string
    },
    signal: AbortSignal
  ) => Promise<unknown>
  findExisting?: (
    relationship: {
      from_document_uuid: string
      to_document_uuid: string
      predicate_uuid: string
    },
    signal: AbortSignal
  ) => Promise<boolean>
}): Promise<ImportRelationshipPersistenceResult[]> => {
  const results: ImportRelationshipPersistenceResult[] = []
  for (const plan of plans) {
    const relationshipKey = importRelationshipKey(plan)
    if (signal.aborted) throw new DOMException('Relationship persistence cancelled', 'AbortError')
    if (plan.status !== 'ready' || !plan.parent) {
      results.push({ relationshipKey, status: 'blocked', error: plan.reason })
      continue
    }
    const childUuid = documentUuids.get(relationshipDocumentKey(plan.child))
    const parentUuid = documentUuids.get(relationshipDocumentKey(plan.parent))
    const predicateUuid = predicateUuids.get(plan.predicate)
    if (!childUuid || !parentUuid || !predicateUuid) {
      const missing = [
        !childUuid ? 'child document' : undefined,
        !parentUuid ? 'parent document' : undefined,
        !predicateUuid ? `predicate "${plan.predicate}"` : undefined,
      ].filter((value): value is string => value !== undefined)
      results.push({
        relationshipKey,
        status: 'blocked',
        error: `UUID unavailable for ${missing.join(', ')}`,
      })
      continue
    }
    const relationship = {
      from_document_uuid: childUuid,
      to_document_uuid: parentUuid,
      predicate_uuid: predicateUuid,
    }
    try {
      if (findExisting && (await findExisting(relationship, signal))) {
        results.push({ relationshipKey, status: 'existing' })
        continue
      }
      await post(relationship, signal)
      results.push({ relationshipKey, status: 'created' })
    } catch (error) {
      results.push({
        relationshipKey,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return results
}
