import { useAuth } from '@/auth/useAuth'
import {
  fetchDocumentRollup,
  fetchDocuments,
  fetchDocumentWithPermissions,
} from '@/manage/document/services'
import { getObjectTypeListQuery } from '@/manage/object_type/useObjectTypeList'
import { postgrestRollupArgs } from '@/services/postgrest/endpoints'
import type { IPostgrestParams } from '@/types/types'
import { queryOptions, useQueries, useQuery } from '@tanstack/react-query'

export const documentListQueryKey = ({
  params,
  rollups,
}: {
  params?: IPostgrestParams
  rollups?: string[]
}) =>
  ['document','documents-list'].concat(
    (rollups ?? []).map((r) => postgrestRollupArgs({ rollupColumn: r, params }).toString())
  )

export const getDocumentListQuery = ({
  params,
  token,
}: {
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: documentListQueryKey({ params }),
    queryFn: async ({ signal }) => {
      const items = await fetchDocuments({
        params: {
          ...params,
          limit: 100,
        },
        token: token ?? '',
        signal,
      })

      return {
        items,
      }
    },
  })
}

export const getDocumentListWithRollupsQuery = ({
  params,
  targetedParams,
  rollups,
  token,
}: {
  params?: IPostgrestParams
  targetedParams?: Record<string, IPostgrestParams>
  rollups?: string[]
  token?: string
}) => {
  return queryOptions({
    queryKey: documentListQueryKey({ params, rollups }),
    queryFn: async ({ signal }) => {
      const rollupResults = await Promise.all(
        (rollups ?? []).map((rollup) =>
          fetchDocumentRollup({
            rollup,
            params: {
              ...params,
              ...targetedParams?.[rollup],
            },
            token: token ?? '',
            signal,
          })
        )
      )

      const items = await fetchDocumentWithPermissions({
        params: {
          ...params,
          limit: 100,
          ...targetedParams?.['document'],
        },
        token: token ?? '',
        signal,
      })

      return {
        rollups: Object.fromEntries(
          (rollups ?? []).map((rollup, index) => [rollup, rollupResults[index]])
        ),
        items,
      }
    },
  })
}

export const useDocumentListWithRollups = ({
  params,
  targetedParams,
  rollups,
}: {
  params?: IPostgrestParams
  targetedParams?: Record<string, IPostgrestParams>
  rollups?: string[]
}) => {
  const auth = useAuth()

  const queryResult = useQuery(
    getDocumentListWithRollupsQuery({
      params,
      targetedParams,
      rollups,
      token: auth.user?.access_token,
    })
  )

  return queryResult
}

export const useDocumentList = ({ params }: { params?: IPostgrestParams }) => {
  const auth = useAuth()

  const queryResult = useQuery(getDocumentListQuery({ params, token: auth.user?.access_token }))

  return queryResult
}

export const useDocumentListWithObjectTypes = ({ params }: { params?: IPostgrestParams }) => {
  const auth = useAuth()
  const queryObject = {
    object_types: getObjectTypeListQuery({ token: auth.user?.access_token ?? '' }),
    documents: getDocumentListQuery({ params, token: auth.user?.access_token ?? '' }),
  }

  const r = useQueries({
    queries: Object.values(queryObject),
    combine: (results) => {
      const isLoading = results.some((r) => r.isLoading)
      return {
        isLoading,
        isPending: results.some((r) => r.isPending),
        error: results.find((r) => r.error)?.error ?? null,
        data: !isLoading
          ? Object.fromEntries(
              results.map((r, index) => (r.data ? [Object.keys(queryObject)[index], r.data] : []))
            )
          : null,
      }
    },
  })
  return r
}
