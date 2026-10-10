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
  existingDocumentUuid?: string
}

export type ImportRelationshipPlan = {
  parent?: ImportRelationshipCandidate
  parentChoices?: ImportRelationshipCandidate[]
  child: ImportRelationshipCandidate
  predicate: string
  status: ImportRelationshipStatus
  reason?: string
}

type RelationshipRule = IHydratedExpectedChildType & {
  object_type_uuid?: string
  parentMatchField?: string
  childMatchField?: string
  existingParentPolicy?: 'lookup'
}

const readPath = (value: unknown, path?: string): unknown => {
  if (!path) return undefined
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

const readCandidateField = (
  candidate: ImportRelationshipCandidate,
  field?: string
): unknown => {
  if (field === 'slug') return candidate.record.slug
  const dataValue = readPath(candidate.record.data, field)
  if (dataValue !== undefined) return dataValue
  return undefined
}

const identity = (candidate: ImportRelationshipCandidate, field?: string): string => {
  const fieldValue = readCandidateField(candidate, field)
  if (typeof fieldValue === 'string' && fieldValue.length > 0) return fieldValue
  if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return String(fieldValue)
  return `${candidate.record.provenance.sourceId}:${candidate.record.provenance.externalId}`
}

export const getRelationshipMatchValue = (
  candidate: ImportRelationshipCandidate,
  field?: string
): string | undefined => {
  if (!field) return undefined
  const fieldValue = readCandidateField(candidate, field)
  if (typeof fieldValue === 'string') return fieldValue.length > 0 ? fieldValue : undefined
  if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return String(fieldValue)
  return undefined
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
    existingParentPolicy: rule.existingParentPolicy,
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
        existingParentPolicy: candidate.existingParentPolicy,
        to_parent_predicate: candidate.predicate,
      }))
    const configuredChildSlugs = new Set(
      configuredRules.map((rule) => rule.object_type_slug).filter(Boolean)
    )
    const backendRules = rulesFor(objectType).filter(
      (rule) => !rule.object_type_slug || !configuredChildSlugs.has(rule.object_type_slug)
    )
    const rules = [...backendRules, ...configuredRules].filter(
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
          parentChoices: matchingParents,
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

export const IMPORT_RELATIONSHIP_BATCH_SIZE = 10
export const IMPORT_RELATIONSHIP_DELAY_MS = 100

export const persistImportRelationships = async ({
  plans,
  documentUuids,
  predicateUuids,
  signal,
  post,
  findExisting,
  batchSize = IMPORT_RELATIONSHIP_BATCH_SIZE,
  delayMsBetweenBatches = IMPORT_RELATIONSHIP_DELAY_MS,
  onProgress,
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
  batchSize?: number
  delayMsBetweenBatches?: number
  onProgress?: (completed: number, total: number) => void
}): Promise<ImportRelationshipPersistenceResult[]> => {
  const results: ImportRelationshipPersistenceResult[] = []
  let completed = 0
  onProgress?.(0, plans.length)
  const persistPlan = async (plan: ImportRelationshipPlan) => {
    const relationshipKey = importRelationshipKey(plan)
    if (signal.aborted) throw new DOMException('Relationship persistence cancelled', 'AbortError')
    if (plan.status !== 'ready' || !plan.parent) {
      return { relationshipKey, status: 'blocked' as const, error: plan.reason }
    }
    const childUuid = documentUuids.get(relationshipDocumentKey(plan.child))
    const parentUuid =
      plan.parent.existingDocumentUuid ?? documentUuids.get(relationshipDocumentKey(plan.parent))
    const predicateUuid = predicateUuids.get(plan.predicate)
    if (!childUuid || !parentUuid || !predicateUuid) {
      const missing = [
        !childUuid ? 'child document' : undefined,
        !parentUuid ? 'parent document' : undefined,
        !predicateUuid ? `predicate "${plan.predicate}"` : undefined,
      ].filter((value): value is string => value !== undefined)
      return {
        relationshipKey,
        status: 'blocked' as const,
        error: `UUID unavailable for ${missing.join(', ')}`,
      }
    }
    const relationship = {
      from_document_uuid: childUuid,
      to_document_uuid: parentUuid,
      predicate_uuid: predicateUuid,
    }
    try {
      if (findExisting && (await findExisting(relationship, signal))) {
        return { relationshipKey, status: 'existing' as const }
      }
      await post(relationship, signal)
      return { relationshipKey, status: 'created' as const }
    } catch (error) {
      return {
        relationshipKey,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const waitBetweenBatches = async () => {
    if (delayMsBetweenBatches <= 0) return
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, delayMsBetweenBatches)
      const abort = () => {
        clearTimeout(timeout)
        reject(new DOMException('Relationship persistence cancelled', 'AbortError'))
      }
      if (signal.aborted) {
        abort()
        return
      }
      signal.addEventListener('abort', abort, { once: true })
      setTimeout(() => signal.removeEventListener('abort', abort), delayMsBetweenBatches)
    })
  }

  for (let start = 0; start < plans.length; start += Math.max(1, batchSize)) {
    const batch = plans.slice(start, start + Math.max(1, batchSize))
    const batchResults = await Promise.all(
      batch.map(async (plan) => {
        const result = await persistPlan(plan)
        onProgress?.(++completed, plans.length)
        return result
      })
    )
    results.push(...batchResults)
    if (start + batch.length < plans.length) await waitBetweenBatches()
  }
  return results
}
