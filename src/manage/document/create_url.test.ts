import { describe, expect, it } from 'vitest'
import { buildCreateDocumentUrl } from './create_url'

describe('buildCreateDocumentUrl', () => {
  const parentDocument = {
    uuid: 'parent-uuid',
    object_type_uuid: 'parent-type-uuid',
  }

  it('builds a standard child-document URL with its parent relationship', () => {
    const url = buildCreateDocumentUrl({
      objectTypeUUID: 'child-type-uuid',
      parentDocument,
      toParentPredicate: 'has_parent',
    })

    expect(url).toBe(
      '/create-document/child-type-uuid/object_type?parentDocumentUUID=parent-uuid&parentObjectTypeUUID=parent-type-uuid&toParentPredicate=has_parent&returnToOnSuccess=%2Fcreate-document-success'
    )
  })

  it('preserves custom route parameters and appends the parent relationship', () => {
    const url = buildCreateDocumentUrl({
      objectTypeUUID: 'child-type-uuid',
      parentDocument,
      toParentPredicate: 'has_parent',
      createViewPath: '/create-document/parent-uuid/has_parent/expected-predicate/:object_type_uuid/object_type?tab=ec-0',
    })

    expect(url).toBe(
      '/create-document/parent-uuid/has_parent/expected-predicate/child-type-uuid/object_type?tab=ec-0&parentDocumentUUID=parent-uuid&parentObjectTypeUUID=parent-type-uuid&toParentPredicate=has_parent&returnToOnSuccess=%2Fcreate-document-success'
    )
  })

  it('supports a custom create route and form when no parent is supplied', () => {
    const url = buildCreateDocumentUrl({
      objectTypeUUID: 'object-type-uuid',
      documentCreatePath: '/custom-create/',
      formUUID: 'form-uuid',
    })

    expect(url).toBe(
      '/custom-create/object-type-uuid/object_type/form-uuid/form?returnToOnSuccess=%2Fcreate-document-success'
    )
  })
})
