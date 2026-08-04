import { postgrestUrl } from '@/services/postgrest/endpoints'
import {
  deleteFromPostgrest,
  fetchListFromPostgrest,
  fetchRollupFromPostgrest,
  fetchSingleFromPostgrest,
  patchToPostgrest,
  postToPostgrest,
  upsertToPostgrest,
} from '@/services/postgrest/services'
import type { IDocument, IPostgrestParams, IPredicate } from '@/types/types'

export const DOCUMENTS_TABLE = 'document'
export const PREDICATES_TABLE = 'predicate'

export const fetchPredicates = async ({
  params,
  queryString,
  signal
}: {
  params?: IPostgrestParams,
  queryString?: string,
  signal?: AbortSignal
}): Promise<IPredicate[]> => {
  const url = postgrestUrl({ table: PREDICATES_TABLE, params, queryString })
  const response = await fetch(url, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  return result as unknown as IPredicate[]
}

export const fetchDocuments = async <T>({
  params,
  token,
  signal,
}: {
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<IDocument<T>[]> => {
  const documents = await fetchListFromPostgrest<IDocument<T>>({
    table: DOCUMENTS_TABLE,
    params,
    token,
    signal,
  })
  return documents
}

export const fetchDocumentWithPermissions = async <T>({
  params,
  token,
  signal,
}: {
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<(IDocument<T> & { can_modify: boolean })[]> => {
  const documents = await fetchListFromPostgrest<IDocument<T> & { can_modify: boolean }>({
    table: 'document_with_permissions',
    params,
    token,
    signal,
  })
  return documents
}

export const fetchDocument = async <T>({
  uuid,
  params,
  token,
  signal,
}: {
  uuid: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<IDocument<T>> => {
  const document = await fetchSingleFromPostgrest<IDocument<T>>({
    table: DOCUMENTS_TABLE,
    uuid,
    params,
    token,
    signal,
  })
  return document
}

export const fetchDocumentRollup = async ({
  rollup,
  params,
  token,
  signal,
}: {
  rollup: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<{ label: string; count: number }[]> => {
  const list = await fetchRollupFromPostgrest({
    table: 'document_with_permissions',
    rollupColumn: rollup,
    params,
    token,
    signal,
  })
  return list
}

export const postDocument = async <T>({
  document,
  token,
  signal,
}: {
  document: Omit<IDocument<T>, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>
  token: string
  signal?: AbortSignal
}): Promise<IDocument<T>> => {
  const doc = await postToPostgrest<
    Omit<IDocument<T>, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>,
    IDocument<T>
  >({
    table: DOCUMENTS_TABLE,
    body: document,
    token,
    signal,
  })
  return doc
}

export const patchDocument = async ({
  uuid,
  document,
  token,
  signal,
}: {
  uuid: string
  document: Partial<IDocument>
  token: string
  signal?: AbortSignal
}): Promise<IDocument> => {
  const newFieldOverrideConfig = await patchToPostgrest<IDocument>({
    uuid,
    table: DOCUMENTS_TABLE,
    body: document,
    token,
    signal,
  })
  return newFieldOverrideConfig
}

export const patchShare = async ({
  uuid,
  subs_for_update,
  token,
  signal,
}: {
  uuid: string
  subs_for_update?: string[]
  subs_for_select?: string[]
  roles_for_update?: string[]
  roles_for_select?: string[]
  token: string
  signal?: AbortSignal
}): Promise<IDocument> => {
  const newFieldOverrideConfig = await upsertToPostgrest<IDocument>({
    uuid,
    table: DOCUMENTS_TABLE,
    body: { subs_for_update },
    token,
    signal,
  })
  return newFieldOverrideConfig
}

export const deleteDocument = async ({
  uuid,
  token,
  signal,
}: {
  uuid: string
  token: string
  signal?: AbortSignal
}): Promise<void> => {
  await deleteFromPostgrest({
    table: DOCUMENTS_TABLE,
    uuid,
    token,
    signal,
  })
}
