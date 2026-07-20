import { postgrestUrl } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import {
  deleteFromPostgrest,
  fetchListFromPostgrest,
  fetchRollupFromPostgrest,
  fetchSingleFromPostgrest,
  postToPostgrest,
  upsertToPostgrest,
} from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IDocument, IPostgrestParams, IPredicate } from ***REMOVED***@/types/types***REMOVED***

export const DOCUMENTS_TABLE = ***REMOVED***document***REMOVED***
export const PREDICATES_TABLE = ***REMOVED***predicate***REMOVED***

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
    table: ***REMOVED***document_with_permissions***REMOVED***,
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
    table: ***REMOVED***document_with_permissions***REMOVED***,
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
  document: Omit<IDocument<T>, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
  token: string
  signal?: AbortSignal
}): Promise<IDocument<T>> => {
  const doc = await postToPostgrest<
    Omit<IDocument<T>, ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
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
  document: IDocument
  token: string
  signal?: AbortSignal
}): Promise<IDocument> => {
  const newFieldOverrideConfig = await upsertToPostgrest<IDocument>({
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
