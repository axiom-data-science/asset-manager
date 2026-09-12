import {
    deleteFromPostgrest,
    fetchListFromPostgrest,
    fetchRollupFromPostgrest,
    fetchSingleFromPostgrest,
    patchToPostgrest,
    postToPostgrest,
} from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IPredicate, IPostgrestParams } from ***REMOVED***@/types/types***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

export const PREDICATE_TABLE = ***REMOVED***predicate***REMOVED***

export const fetchPredicates = async ({
    params,
    queryString,
    token,
    signal,
}: {
    params?: IPostgrestParams
    queryString?: string
    token?: string
    signal?: AbortSignal
}): Promise<IPredicate[]> => {
    const predicates = await fetchListFromPostgrest<IPredicate>({
        table: PREDICATE_TABLE,
        params,
        queryString,
        token,
        signal,
    })
    return predicates
}

export const fetchPredicate = async ({
    uuid,
    params,
    token,
    signal,
}: {
    uuid: string
    params?: IPostgrestParams
    token?: string
    signal?: AbortSignal
}): Promise<IPredicate> => {
    const predicate = await fetchSingleFromPostgrest<IPredicate>({
        table: PREDICATE_TABLE,
        uuid,
        params,
        token,
        signal,
    })
    return predicate
}

export const fetchPredicateRollup = async ({
    rollup,
    params,
    token,
    signal,
}: {
    rollup: string
    params?: IPostgrestParams
    token?: string
    signal?: AbortSignal
}): Promise<{ label: string; count: number }[]> => {
    const list = await fetchRollupFromPostgrest({
        table: PREDICATE_TABLE,
        rollupColumn: rollup,
        params: omit(params, [***REMOVED***order***REMOVED***]),
        token,
        signal,
    })
    return list
}

export const postPredicate = async ({
    predicate,
    token,
    signal,
}: {
    predicate: Omit<IPredicate, ***REMOVED***uuid***REMOVED***>
    token: string
    signal?: AbortSignal
}): Promise<IPredicate> => {
    const newPredicate = await postToPostgrest<Omit<IPredicate, ***REMOVED***uuid***REMOVED***>, IPredicate>({
        table: PREDICATE_TABLE,
        body: predicate,
        token,
        signal,
    })
    return newPredicate
}

export const patchPredicate = async ({
    uuid,
    predicate,
    token,
    signal,
}: {
    uuid: string
    predicate: Partial<IPredicate>
    token: string
    signal?: AbortSignal
}): Promise<IPredicate> => {
    const updatedPredicate = await patchToPostgrest<IPredicate>({
        uuid,
        table: PREDICATE_TABLE,
        body: predicate,
        token,
        signal,
    })
    return updatedPredicate
}

export const deletePredicate = async ({
    uuid,
    token,
    signal,
}: {
    uuid: string
    token: string
    signal?: AbortSignal
}): Promise<void> => {
    await deleteFromPostgrest({
        table: PREDICATE_TABLE,
        uuid,
        token,
        signal,
    })
}
