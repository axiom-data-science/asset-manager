import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import {
  fetchDocumentRollup,
  fetchDocuments,
  fetchDocumentWithPermissions,
} from ***REMOVED***@/manage/document/services***REMOVED***
import { getObjectTypeListQuery } from ***REMOVED***@/manage/object_type/useObjectTypeList***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { queryOptions, useQueries, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

export const documentListQueryKey = ({
  params,
  rollups,
}: {
  params?: IPostgrestParams
  rollups?: string[]
}) =>
  [***REMOVED***documents-list***REMOVED***].concat(
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
        token: token ?? ***REMOVED******REMOVED***,
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
            token: token ?? ***REMOVED******REMOVED***,
            signal,
          })
        )
      )

      const items = await fetchDocumentWithPermissions({
        params: {
          ...params,
          limit: 100,
          ...targetedParams?.[***REMOVED***document***REMOVED***],
        },
        token: token ?? ***REMOVED******REMOVED***,
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
    object_types: getObjectTypeListQuery({ token: auth.user?.access_token ?? ***REMOVED******REMOVED*** }),
    documents: getDocumentListQuery({ params, token: auth.user?.access_token ?? ***REMOVED******REMOVED*** }),
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
