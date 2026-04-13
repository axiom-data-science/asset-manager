import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchObjectTypeRollup, fetchObjectTypes } from ***REMOVED***@/manage/object_type/services***REMOVED***
import { postgrestRollupArgs } from ***REMOVED***@/services/postgrest/endpoints***REMOVED***
import type { IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { getFormListQueryOptions } from ***REMOVED***../form/useFormList***REMOVED***
import { getObjectSchemaListQueryOptions } from ***REMOVED***../object_schema/useObjectSchemaList***REMOVED***
import { useCombinedQueries } from ***REMOVED***@/hooks/use-combined-queries***REMOVED***

export const objectTypeListQueryKey = (params?: IPostgrestParams, rollups?: string[]) =>
  [***REMOVED***object_type-list***REMOVED***].concat(
    (rollups ?? []).map((r) => postgrestRollupArgs({ rollupColumn: r, params }).toString())
  )

export const getObjectTypeListWithRollupsQuery = ({
  params,
  rollups,
  token,
}: {
  params?: IPostgrestParams
  rollups?: string[]
  token?: string
}) => {
  return queryOptions({
    queryKey: objectTypeListQueryKey(params, rollups),
    queryFn: async ({ signal }) => {
      const rollupResults = await Promise.all(
        (rollups ?? []).map((rollup) =>
          fetchObjectTypeRollup({
            rollup,
            params,
            token: token ?? ***REMOVED******REMOVED***,
            signal,
          })
        )
      )

      const items = await fetchObjectTypes({
        params: {
          ...params,
          limit: 100,
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

export const getObjectTypeListQuery = ({
  params,
  token,
}: {
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: objectTypeListQueryKey(params),
    queryFn: async ({ signal }) => {
      const items = await fetchObjectTypes({
        params: {
          ...params,
          limit: 100,
        },
        token: token ?? ***REMOVED******REMOVED***,
        signal,
      })
      return items
    },
  })
}

export const useObjectTypeListWithRollups = ({
  params,
  rollups,
}: {
  params?: IPostgrestParams
  rollups?: string[]
}) => {
  const auth = useAuth()
  const queryResult = useQuery(
    getObjectTypeListWithRollupsQuery({ params, rollups, token: auth.user?.access_token })
  )

  return queryResult
}

export const useObjectTypeList = ({ params }: { params?: IPostgrestParams } = {}) => {
  const auth = useAuth()
  const queryResult = useQuery(getObjectTypeListQuery({ params, token: auth.user?.access_token }))
  return queryResult
}

export const useObjectTypeListAtCategory = (
  { category }: { category?: string } = { category: ***REMOVED***document***REMOVED*** }
) => {
  return useObjectTypeList({
    params: {
      filters:
        category !== undefined
          ? [
              {
                column: ***REMOVED***category***REMOVED***,
                operator: ***REMOVED***eq***REMOVED***,
                value: category,
              },
            ]
          : undefined,
    },
  })
}

export const useObjectTypesAndFormsAndSchemas = ({
  params,
  object_type_params,
  form_params,
  schema_params,
}: {
  params?: IPostgrestParams
  object_type_params?: IPostgrestParams
  form_params?: IPostgrestParams
  schema_params?: IPostgrestParams
} = {}) => {
  const auth = useAuth()
  const queryObject = {
    object_types: getObjectTypeListQuery({
      params: object_type_params ?? params,
      token: auth.user?.access_token,
    }),
    forms: getFormListQueryOptions({
      params: form_params ?? params,
      token: auth.user?.access_token,
    }),
    schemas: getObjectSchemaListQueryOptions({
      params: schema_params ?? params,
      token: auth.user?.access_token,
    }),
  }
  return useCombinedQueries(queryObject)
}
