import { useQueries } from "@tanstack/react-query"
import type { dataTagSymbol, QueryKey } from "@tanstack/query-core"

type QueryOptionsRecord = Record<string, { queryKey: QueryKey }>

type InferQueryData<T> =
    T extends { queryKey: { [K in dataTagSymbol]: infer TData } }
        ? TData
        : unknown

type CombinedData<T extends QueryOptionsRecord> = {
    [K in keyof T]: InferQueryData<T[K]>
}

type CombinedResult<T extends QueryOptionsRecord> = {
    isLoading: boolean
    isPending: boolean
    error: Error | null
    data: CombinedData<T> | null
}

export function useCombinedQueries<T extends QueryOptionsRecord>(queryObject: T): CombinedResult<T> {
    const keys = Object.keys(queryObject)
    const queries = Object.values(queryObject) as Parameters<typeof useQueries>[0][***REMOVED***queries***REMOVED***]
    return useQueries({
        queries,
        combine: (results) => {
            const isLoading = results.some(r => r.isLoading)
            return {
                isLoading,
                isPending: results.some(r => r.isPending),
                error: results.find(r => r.error)?.error ?? null,
                data: !isLoading
                    ? Object.fromEntries(
                        results.map((r, index) => r.data ? [keys[index], r.data] : [])
                    ) as CombinedData<T>
                    : null
            }
        }
    }) as CombinedResult<T>
}
