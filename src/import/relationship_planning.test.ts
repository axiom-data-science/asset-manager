import { describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***
import type { IObjectType } from ***REMOVED***@/types/types***REMOVED***
import type { CanonicalImportRecord } from ***REMOVED***./types***REMOVED***
import {
  persistImportRelationships,
  importRelationshipKey,
  planImportRelationships,
  relationshipDocumentKey,
  type ImportRelationshipCandidate,
} from ***REMOVED***./relationship_planning***REMOVED***

const objectType = (
  uuid: string,
  slug: string,
  expectedChildTypes: Record<string, unknown>[]
): IObjectType => ({
  uuid,
  slug,
  owner_sub: ***REMOVED***owner***REMOVED***,
  label: slug,
  category: ***REMOVED***document***REMOVED***,
  created_at: ***REMOVED******REMOVED***,
  updated_at: ***REMOVED******REMOVED***,
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
    description: ***REMOVED******REMOVED***,
    data,
    attrs: {},
    sourceData: data,
    provenance: { sourceId, externalId },
  } as CanonicalImportRecord,
})

describe(***REMOVED***Import relationship planning***REMOVED***, () => {
  it(***REMOVED***plans a relationship using provenance identity by default***REMOVED***, () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)

    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, child],
    })

    expect(plans).toMatchObject([
      {
        parent: { record: { provenance: { externalId: ***REMOVED***parent-1***REMOVED*** } } },
        child: { record: { provenance: { externalId: ***REMOVED***parent-1***REMOVED*** } } },
        predicate: ***REMOVED***belongs_to***REMOVED***,
        status: ***REMOVED***ready***REMOVED***,
      },
    ])
  })

  it(***REMOVED***reports missing and ambiguous parents***REMOVED***, () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const duplicateParent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, {
      key: ***REMOVED***same***REMOVED***,
    })
    const missingChild = candidate(***REMOVED***source***REMOVED***, ***REMOVED***missing***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const ambiguousChild = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, duplicateParent, missingChild, ambiguousChild],
    })

    expect(plans.map(({ status }) => status)).toEqual([***REMOVED***missing-parent***REMOVED***, ***REMOVED***ambiguous-parent***REMOVED***])
  })

  it(***REMOVED***uses configured data paths for parent and child matching***REMOVED***, () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, { code: ***REMOVED***A-1***REMOVED*** })
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***child-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***, { parentCode: ***REMOVED***A-1***REMOVED*** })
    const plans = planImportRelationships({
      parentObjectTypes: new Map([[***REMOVED***parent-type***REMOVED***, objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [])]]),
      candidates: [parent, child],
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***parents***REMOVED***,
          childObjectTypeSlug: ***REMOVED***children***REMOVED***,
          parentMatchField: ***REMOVED***code***REMOVED***,
          childMatchField: ***REMOVED***parentCode***REMOVED***,
          predicate: ***REMOVED***belongs_to***REMOVED***,
        },
      ],
    })

    expect(plans[0]).toMatchObject({ status: ***REMOVED***ready***REMOVED***, predicate: ***REMOVED***belongs_to***REMOVED*** })
  })

  it(***REMOVED***joins parent and child records from different CSV source IDs***REMOVED***, () => {
    const parent = candidate(***REMOVED***departments.csv-1***REMOVED***, ***REMOVED***department-1***REMOVED***, ***REMOVED***department-type***REMOVED***, ***REMOVED***departments***REMOVED***, {
      code: ***REMOVED***D-1***REMOVED***,
    })
    const child = candidate(***REMOVED***assets.csv-2***REMOVED***, ***REMOVED***asset-1***REMOVED***, ***REMOVED***asset-type***REMOVED***, ***REMOVED***assets***REMOVED***, {
      department_code: ***REMOVED***D-1***REMOVED***,
    })

    const plans = planImportRelationships({
      parentObjectTypes: new Map([[***REMOVED***department-type***REMOVED***, objectType(***REMOVED***department-type***REMOVED***, ***REMOVED***departments***REMOVED***, [])]]),
      candidates: [parent, child],
      relationshipRules: [{
        parentObjectTypeSlug: ***REMOVED***departments***REMOVED***,
        childObjectTypeSlug: ***REMOVED***assets***REMOVED***,
        parentMatchField: ***REMOVED***code***REMOVED***,
        childMatchField: ***REMOVED***department_code***REMOVED***,
        predicate: ***REMOVED***belongs_to***REMOVED***,
      }],
    })

    expect(plans).toMatchObject([{
      status: ***REMOVED***ready***REMOVED***,
      parent: { record: { provenance: { sourceId: ***REMOVED***departments.csv-1***REMOVED*** } } },
      child: { record: { provenance: { sourceId: ***REMOVED***assets.csv-2***REMOVED*** } } },
    }])
  })

  it(***REMOVED***deduplicates equivalent backend and adapter relationship rules***REMOVED***, () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, { code: ***REMOVED***A-1***REMOVED*** })
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***child-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***, { parentCode: ***REMOVED***A-1***REMOVED*** })
    const rule = {
      object_type_slug: ***REMOVED***children***REMOVED***,
      parentMatchField: ***REMOVED***code***REMOVED***,
      childMatchField: ***REMOVED***parentCode***REMOVED***,
      to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
    }
    const plans = planImportRelationships({
      parentObjectTypes: new Map([[***REMOVED***parent-type***REMOVED***, objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [rule])]]),
      candidates: [parent, child],
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***parents***REMOVED***,
          childObjectTypeSlug: ***REMOVED***children***REMOVED***,
          parentMatchField: ***REMOVED***code***REMOVED***,
          childMatchField: ***REMOVED***parentCode***REMOVED***,
          predicate: ***REMOVED***belongs_to***REMOVED***,
        },
      ],
    })

    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({ status: ***REMOVED***ready***REMOVED***, predicate: ***REMOVED***belongs_to***REMOVED*** })
  })

  it(***REMOVED***matches configured identities when payload fields are numbers***REMOVED***, () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, { id: 17 })
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***child-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***, { parentId: 17 })
    const plans = planImportRelationships({
      parentObjectTypes: new Map([[***REMOVED***parent-type***REMOVED***, objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [])]]),
      candidates: [parent, child],
      relationshipRules: [
        {
          parentObjectTypeSlug: ***REMOVED***parents***REMOVED***,
          childObjectTypeSlug: ***REMOVED***children***REMOVED***,
          parentMatchField: ***REMOVED***id***REMOVED***,
          childMatchField: ***REMOVED***parentId***REMOVED***,
          predicate: ***REMOVED***belongs_to***REMOVED***,
        },
      ],
    })

    expect(plans[0]).toMatchObject({ status: ***REMOVED***ready***REMOVED***, predicate: ***REMOVED***belongs_to***REMOVED*** })
  })

  it(***REMOVED***reports a missing parent when only child records are imported***REMOVED***, () => {
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [child],
    })

    expect(plans[0]).toMatchObject({ status: ***REMOVED***missing-parent***REMOVED***, child })
    expect(plans[0].parent).toBeUndefined()
  })

  it(***REMOVED***persists only ready relationships from child to parent***REMOVED***, async () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, child],
    })
    const post = vi.fn().mockResolvedValue({ uuid: ***REMOVED***relationship-1***REMOVED*** })
    const results = await persistImportRelationships({
      plans,
      documentUuids: new Map([
        [relationshipDocumentKey(parent), ***REMOVED***parent-document***REMOVED***],
        [relationshipDocumentKey(child), ***REMOVED***child-document***REMOVED***],
      ]),
      predicateUuids: new Map([[***REMOVED***belongs_to***REMOVED***, ***REMOVED***predicate-1***REMOVED***]]),
      signal: new AbortController().signal,
      post,
    })

    expect(results).toEqual([
      { relationshipKey: ***REMOVED***child-type:source:parent-1:belongs_to***REMOVED***, status: ***REMOVED***created***REMOVED*** },
    ])
    expect(post).toHaveBeenCalledWith(
      {
        from_document_uuid: ***REMOVED***child-document***REMOVED***,
        to_document_uuid: ***REMOVED***parent-document***REMOVED***,
        predicate_uuid: ***REMOVED***predicate-1***REMOVED***,
      },
      expect.any(AbortSignal)
    )
  })

  it.each([
    [***REMOVED***both documents are new***REMOVED***, ***REMOVED***parent-document***REMOVED***, ***REMOVED***child-document***REMOVED***],
    [***REMOVED***the parent already exists***REMOVED***, ***REMOVED***existing-parent***REMOVED***, ***REMOVED***child-document***REMOVED***],
    [***REMOVED***the child already exists***REMOVED***, ***REMOVED***parent-document***REMOVED***, ***REMOVED***existing-child***REMOVED***],
  ])(***REMOVED***persists relationships when %s***REMOVED***, async (_caseName, parentUuid, childUuid) => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [child, parent],
    })
    const post = vi.fn().mockResolvedValue({ uuid: ***REMOVED***relationship-1***REMOVED*** })
    const results = await persistImportRelationships({
      plans,
      documentUuids: new Map([
        [relationshipDocumentKey(parent), parentUuid],
        [relationshipDocumentKey(child), childUuid],
      ]),
      predicateUuids: new Map([[***REMOVED***belongs_to***REMOVED***, ***REMOVED***predicate-1***REMOVED***]]),
      signal: new AbortController().signal,
      post,
    })

    expect(results).toEqual([
      { relationshipKey: ***REMOVED***child-type:source:parent-1:belongs_to***REMOVED***, status: ***REMOVED***created***REMOVED*** },
    ])
    expect(post).toHaveBeenCalledWith(
      {
        from_document_uuid: childUuid,
        to_document_uuid: parentUuid,
        predicate_uuid: ***REMOVED***predicate-1***REMOVED***,
      },
      expect.any(AbortSignal)
    )
  })

  it(***REMOVED***allows a failed relationship to be retried without changing the plan***REMOVED***, async () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, child],
    })
    let attempts = 0
    const post = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error(***REMOVED***temporary failure***REMOVED***)
      return { uuid: ***REMOVED***relationship-1***REMOVED*** }
    })
    const options = {
      plans,
      documentUuids: new Map([
        [relationshipDocumentKey(parent), ***REMOVED***parent-document***REMOVED***],
        [relationshipDocumentKey(child), ***REMOVED***child-document***REMOVED***],
      ]),
      predicateUuids: new Map([[***REMOVED***belongs_to***REMOVED***, ***REMOVED***predicate-1***REMOVED***]]),
      signal: new AbortController().signal,
      post,
    }

    const first = await persistImportRelationships(options)
    const retry = await persistImportRelationships({
      ...options,
      plans: plans.filter((plan) =>
        first.some(
          (result) =>
            result.status === ***REMOVED***failed***REMOVED*** && result.relationshipKey === importRelationshipKey(plan)
        )
      ),
    })

    expect(first[0]).toMatchObject({ status: ***REMOVED***failed***REMOVED*** })
    expect(retry[0]).toMatchObject({ status: ***REMOVED***created***REMOVED*** })
    expect(post).toHaveBeenCalledTimes(2)
  })

  it(***REMOVED***does not post a relationship that already exists on repeat import***REMOVED***, async () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, child],
    })
    const post = vi.fn().mockResolvedValue({ uuid: ***REMOVED***relationship-1***REMOVED*** })
    let relationshipExists = false
    const findExisting = vi.fn(async () => relationshipExists)
    const options = {
      plans,
      documentUuids: new Map([
        [relationshipDocumentKey(parent), ***REMOVED***parent-document***REMOVED***],
        [relationshipDocumentKey(child), ***REMOVED***child-document***REMOVED***],
      ]),
      predicateUuids: new Map([[***REMOVED***belongs_to***REMOVED***, ***REMOVED***predicate-1***REMOVED***]]),
      signal: new AbortController().signal,
      post,
      findExisting,
    }
    const first = await persistImportRelationships(options)
    relationshipExists = true
    const repeat = await persistImportRelationships(options)

    expect(first).toEqual([
      { relationshipKey: ***REMOVED***child-type:source:parent-1:belongs_to***REMOVED***, status: ***REMOVED***created***REMOVED*** },
    ])
    expect(repeat).toEqual([
      { relationshipKey: ***REMOVED***child-type:source:parent-1:belongs_to***REMOVED***, status: ***REMOVED***existing***REMOVED*** },
    ])
    expect(findExisting).toHaveBeenCalledTimes(2)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it(***REMOVED***reports which relationship UUID is unavailable***REMOVED***, async () => {
    const parent = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***)
    const child = candidate(***REMOVED***source***REMOVED***, ***REMOVED***parent-1***REMOVED***, ***REMOVED***child-type***REMOVED***, ***REMOVED***children***REMOVED***)
    const plans = planImportRelationships({
      parentObjectTypes: new Map([
        [
          ***REMOVED***parent-type***REMOVED***,
          objectType(***REMOVED***parent-type***REMOVED***, ***REMOVED***parents***REMOVED***, [
            {
              object_type_slug: ***REMOVED***children***REMOVED***,
              to_parent_predicate: ***REMOVED***belongs_to***REMOVED***,
            },
          ]),
        ],
      ]),
      candidates: [parent, child],
    })

    const results = await persistImportRelationships({
      plans,
      documentUuids: new Map(),
      predicateUuids: new Map([[***REMOVED***belongs_to***REMOVED***, ***REMOVED***predicate-1***REMOVED***]]),
      signal: new AbortController().signal,
      post: vi.fn(),
    })

    expect(results).toEqual([
      {
        relationshipKey: ***REMOVED***child-type:source:parent-1:belongs_to***REMOVED***,
        status: ***REMOVED***blocked***REMOVED***,
        error: ***REMOVED***UUID unavailable for child document, parent document***REMOVED***,
      },
    ])
  })
})
