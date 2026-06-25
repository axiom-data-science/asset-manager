import { DOCUMENTS_TABLE } from '@/manage/document/services'
import { postgrestRollupArgs, postgrestUrl } from '@/services/postgrest/endpoints'
import type { IPostgrestParams } from '@/types/types'

export const fetchListFromPostgrest = async <T>({
  table,
  params,
  token,
  signal,
}: {
  table: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<T[]> => {
  const url = postgrestUrl({ table, params })
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
  token: string
  signal?: AbortSignal
}): Promise<{ label: string; count: number }[]> => {
  const args = postgrestRollupArgs({ rollupColumn, params })
  const url = postgrestUrl({ table, args })
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
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
  uuidColumn = 'uuid',
  params,
  token,
  signal,
}: {
  table: string
  uuid?: string
  uuidColumn?: string
  params?: IPostgrestParams
  token: string
  signal?: AbortSignal
}): Promise<T> => {
  const p = uuid
    ? {
        ...params,
        filters: [
          {
            column: uuidColumn,
            operator: 'eq' as const,
            value: uuid,
          },
          ...(params?.filters ?? []),
        ],
      }
    : params
  const url = postgrestUrl({ table, params: p })
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.pgrst.object+json',
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
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(Array.isArray(body) ? {} : { Accept: 'application/vnd.pgrst.object+json' }),
      }),
      Authorization: `Bearer ${token}`,
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: headersToUse,
      signal,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorText = await response.json()
      throw new Error(`HTTP error! status: ${response.status}. ${errorText?.message ?? ''}`)
    }
    const result = await response.json()
    return result as unknown as R
  } catch (error) {
    console.error('Error posting to Postgrest:', error)
    throw new Error(
      `Error posting to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const uploadFileToPostgrest = async ({
  table = 'rpc/upload_document_file',
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `filename="${file.name}"`,
        Authorization: `Bearer ${token}`,
      },
      signal,
      body: file,
    })
    if (!response.ok) {
      const errorText = await response.json()
      throw new Error(`HTTP error! status: ${response.status}. ${errorText?.message ?? ''}`)
    }
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error posting to Postgrest:', error)
    throw new Error(
      `Error posting to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const deleteFromPostgrest = async ({
  table,
  uuid,
  uuidColumn = 'uuid',
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
            operator: 'eq',
            value: uuid,
          },
        ],
      },
    }
    const url = postgrestUrl({ table, params: paramsToUse })
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error deleting from Postgrest:', error)
    throw new Error(
      `Error deleting from Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const upsertToPostgrest = async <T, R = T>({
  uuid,
  uuidColumn = 'uuid',
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
          operator: 'eq' as const,
          value: uuid,
        },
        ...(params?.filters ?? []),
      ],
    }
    const url = postgrestUrl({ table, params: p })
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
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
    console.error('Error patching to Postgrest:', error)
    throw new Error(
      `Error patching to Postgrest: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const patchToPostgrest = async <T, R = T>({
  uuid,
  uuidColumn = 'uuid',
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
          operator: 'eq' as const,
          value: uuid,
        },
        ...(params?.filters ?? []),
      ],
    }
    const url = postgrestUrl({ table, params: p })
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
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
    console.error('Error patching to Postgrest:', error)
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
          column: 'uuid',
          operator: 'eq',
          value: document_uuid,
        },
      ],
    },
  })

  const request = await (
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
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
      select: ['lock_sub'],
      filters: [
        {
          column: 'uuid',
          operator: 'eq',
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
