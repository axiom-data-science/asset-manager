import { DOCUMENTS_TABLE } from ***REMOVED***@/manage/document/services***REMOVED***
import { postgrestRollupArgs, postgrestUrl } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***

export const fetchListFromPostgrest = async <T>({
  table,
  params,
  queryString,
  token,
  signal,
}: {
  table: string
  params?: IPostgrestParams
  queryString?: string
  token?: string
  signal?: AbortSignal
}): Promise<T[]> => {
  const url = postgrestUrl({ table, params, queryString })
  const headers: Record<string, string> = {}
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(url, {
    headers,
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  return result as unknown as T[]
}

export const fetchRollupFromPostgrest = async ({
  table,
  rollupColumn,
  params,
  token,
  signal,
}: {
  table: string
  rollupColumn: string
  params?: IPostgrestParams
  token?: string
  signal?: AbortSignal
}): Promise<{ label: string; count: number }[]> => {
  const args = postgrestRollupArgs({ rollupColumn, params })
  const url = postgrestUrl({ table, args })
  const response = await fetch(url, {
    headers: {
      ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const list = (await response.json()) as unknown as { [key: string]: string | number }[]

  return list.map((r) => {
    return {
      count: Number(r.count),
      label: r[rollupColumn] as string,
    }
  })
}

export const fetchSingleFromPostgrest = async <T>({
  table,
  uuid,
  uuidColumn = ***REMOVED***uuid***REMOVED***,
  params,
  token,
  signal,
}: {
  table: string
  uuid?: string
  uuidColumn?: string
  params?: IPostgrestParams
  token?: string
  signal?: AbortSignal
}): Promise<T> => {
  const p = uuid
    ? {
      ...params,
      filters: [
        {
          column: uuidColumn,
          operator: ***REMOVED***eq***REMOVED*** as const,
          value: uuid,
        },
        ...(params?.filters ?? []),
      ],
    }
    : params
  const url = postgrestUrl({ table, params: p })
  const response = await fetch(url, {
    headers: {
      ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
      Accept: ***REMOVED***application/vnd.pgrst.object+json***REMOVED***,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  return result as unknown as T
}

export const postToPostgrest = async <T, R = T>({
  table,
  params,
  token,
  signal,
  body,
  headers,
}: {
  table: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
  body: T
  headers?: Record<string, string>
}): Promise<R> => {
  try {
    const url = postgrestUrl({ table, params })
    const headersToUse = {
      ...(headers ?? {
        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
        Prefer: ***REMOVED***return=representation***REMOVED***,
        ...(Array.isArray(body) ? {} : { Accept: ***REMOVED***application/vnd.pgrst.object+json***REMOVED*** }),
      }),
      Authorization: `Bearer ${token}`,
    }
    const response = await fetch(url, {
      method: ***REMOVED***POST***REMOVED***,
      headers: headersToUse,
      signal,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorText = await response.json()
      throw new Error(`HTTP error! status: ${response.status}. ${errorText?.message ?? ***REMOVED******REMOVED***}`)
    }
    const result = await response.json()
    return result as unknown as R
  } catch (error) {
    console.error(***REMOVED***Error posting to Postgrest:***REMOVED***, error)
    throw new Error(
      `Error posting to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const uploadFileToPostgrest = async ({
  table = ***REMOVED***rpc/upload_document_file***REMOVED***,
  params,
  token,
  signal,
  file,
}: {
  table?: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
  file: File
}): Promise<string> => {
  try {
    const url = postgrestUrl({ table, params })
    /*const reader = new FileReader();
        const body = await new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(file);
        }); */
    const response = await fetch(url, {
      method: ***REMOVED***POST***REMOVED***,
      headers: {
        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/octet-stream***REMOVED***,
        ***REMOVED***Content-Disposition***REMOVED***: `filename="${file.name}"`,
        Authorization: `Bearer ${token}`,
      },
      signal,
      body: file,
    })
    if (!response.ok) {
      const errorText = await response.json()
      throw new Error(`HTTP error! status: ${response.status}. ${errorText?.message ?? ***REMOVED******REMOVED***}`)
    }
    const result = await response.json()
    return result
  } catch (error) {
    console.error(***REMOVED***Error posting to Postgrest:***REMOVED***, error)
    throw new Error(
      `Error posting to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const deleteFromPostgrest = async ({
  table,
  uuid,
  uuidColumn = ***REMOVED***uuid***REMOVED***,
  params,
  token,
  signal,
}: {
  table: string
  uuid: string
  uuidColumn?: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<void> => {
  try {
    const paramsToUse: IPostgrestParams = {
      ...params,
      ...{
        limit: 1,
        filters: [
          {
            column: uuidColumn,
            operator: ***REMOVED***eq***REMOVED***,
            value: uuid,
          },
        ],
      },
    }
    const url = postgrestUrl({ table, params: paramsToUse })
    const response = await fetch(url, {
      method: ***REMOVED***DELETE***REMOVED***,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error(***REMOVED***Error deleting from Postgrest:***REMOVED***, error)
    throw new Error(
      `Error deleting from Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const upsertToPostgrest = async <T, R = T>({
  uuid,
  uuidColumn = ***REMOVED***uuid***REMOVED***,
  table,
  params,
  token,
  signal,
  body,
}: {
  uuid: string
  uuidColumn?: string
  table: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
  body: Partial<T>
}): Promise<R> => {
  try {
    const p = {
      ...params,
      filters: [
        {
          column: uuidColumn,
          operator: ***REMOVED***eq***REMOVED*** as const,
          value: uuid,
        },
        ...(params?.filters ?? []),
      ],
    }
    const url = postgrestUrl({ table, params: p })
    const response = await fetch(url, {
      method: ***REMOVED***POST***REMOVED***,
      headers: {
        Authorization: `Bearer ${token}`,
        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
        Prefer: ***REMOVED***resolution=merge-duplicates,return=representation***REMOVED***,
      },
      signal,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    return result as unknown as R
  } catch (error) {
    console.error(***REMOVED***Error patching to Postgrest:***REMOVED***, error)
    throw new Error(
      `Error patching to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const patchToPostgrest = async <T, R = T>({
  uuid,
  uuidColumn = ***REMOVED***uuid***REMOVED***,
  table,
  params,
  token,
  signal,
  body,
}: {
  uuid: string
  uuidColumn?: string
  table: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
  body: Partial<T>
}): Promise<R> => {
  try {
    const p = {
      ...params,
      filters: [
        {
          column: uuidColumn,
          operator: ***REMOVED***eq***REMOVED*** as const,
          value: uuid,
        },
        ...(params?.filters ?? []),
      ],
    }
    const url = postgrestUrl({ table, params: p })
    const response = await fetch(url, {
      method: ***REMOVED***PATCH***REMOVED***,
      headers: {
        Authorization: `Bearer ${token}`,
        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
        Prefer: ***REMOVED***return=representation***REMOVED***,
      },
      signal,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    return result as unknown as R
  } catch (error) {
    console.error(***REMOVED***Error patching to Postgrest:***REMOVED***, error)
    throw new Error(
      `Error patching to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const updateDocumentLock = async ({
  document_uuid,
  user_sub,
  token,
  signal,
  lock = true,
}: {
  document_uuid: string
  user_sub: string
  token: string
  signal?: AbortSignal
  lock?: boolean
}): Promise<boolean> => {
  const url = postgrestUrl({
    table: DOCUMENTS_TABLE,
    params: {
      filters: [
        {
          column: ***REMOVED***uuid***REMOVED***,
          operator: ***REMOVED***eq***REMOVED***,
          value: document_uuid,
        },
      ],
    },
  })

  const request = await (
    await fetch(url, {
      keepalive: lock === false, // make sure unlocks complete even if page is closing,
      method: ***REMOVED***PATCH***REMOVED***,
      headers: {
        Authorization: `Bearer ${token}`,
        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
        Prefer: ***REMOVED***return=representation***REMOVED***,
      },
      signal,
      body: JSON.stringify({
        lock_sub: lock ? user_sub : null,
      }),
    })
  ).json()
  const doc = request && request?.length > 0 ? request[0] : null
  return doc
    ? lock
      ? doc.lock_sub === user_sub
      : doc.lock_sub === null
    : false
}

export const lockDocument = async (params: {
  document_uuid: string
  user_sub: string
  token: string
  signal?: AbortSignal
}): Promise<boolean> => {
  const r = await updateDocumentLock({
    ...params,
    lock: true,
  })

  return r
}

export const unlockDocument = async (params: {
  document_uuid: string
  user_sub: string
  token: string
  signal?: AbortSignal
}): Promise<boolean> => {
  const r = await updateDocumentLock({
    ...params,
    lock: false,
  })

  return r
}

export const checkDocumentLock = async ({
  document_uuid,
  user_sub,
  token,
  signal,
}: {
  document_uuid: string
  user_sub?: string
  token: string
  signal?: AbortSignal
}): Promise<boolean> => {
  const url = postgrestUrl({
    table: DOCUMENTS_TABLE,
    params: {
      select: [***REMOVED***lock_sub***REMOVED***],
      filters: [
        {
          column: ***REMOVED***uuid***REMOVED***,
          operator: ***REMOVED***eq***REMOVED***,
          value: document_uuid,
        },
      ],
    },
  })
  const j = await (
    await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
  ).json()
  return !!(j && j.length > 0 && (!user_sub || j[0].lock_sub === user_sub))
}
