import type { IDocument } from '@/types/types'

type CreateDocumentUrlOptions = {
  objectTypeUUID: string
  documentCreatePath?: string
  parentDocument?: Pick<IDocument<unknown>, 'uuid' | 'object_type_uuid'>
  toParentPredicate?: string
  returnToOnSuccess?: string
  formUUID?: string
  createViewPath?: string
}

export const buildCreateDocumentUrl = ({
  objectTypeUUID,
  documentCreatePath = '/create-document',
  parentDocument,
  toParentPredicate,
  returnToOnSuccess = '/create-document-success',
  formUUID,
  createViewPath,
}: CreateDocumentUrlOptions): string => {
  const defaultPath = `${documentCreatePath.replace(/\/$/, '')}/${objectTypeUUID}/object_type${formUUID ? `/${formUUID}/form` : ''}`
  const templateValues = {
    object_type_uuid: objectTypeUUID,
    parentDocumentUUID: parentDocument?.uuid ?? '',
    toParentPredicate: toParentPredicate ?? '',
    parentObjectTypeUUID: parentDocument?.object_type_uuid ?? '',
    returnToOnSuccess,
  }
  const path = createViewPath
    ? Object.entries(templateValues).reduce(
      (result, [key, value]) => result.split(`:${key}`).join(encodeURIComponent(value)),
      createViewPath
    )
    : defaultPath
  const [pathname, existingSearch = ''] = path.split('?')
  const searchParams = new URLSearchParams(existingSearch)

  if (parentDocument) {
    searchParams.set('parentDocumentUUID', parentDocument.uuid)
    searchParams.set('parentObjectTypeUUID', parentDocument.object_type_uuid)
  }
  if (toParentPredicate) {
    searchParams.set('toParentPredicate', toParentPredicate)
  }
  if (returnToOnSuccess) {
    searchParams.set('returnToOnSuccess', returnToOnSuccess)
  }

  const search = searchParams.toString()
  return search ? `${pathname}?${search}` : pathname
}
