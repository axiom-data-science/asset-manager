import {
    deleteFromPostgrest,
    fetchListFromPostgrest,
    fetchRollupFromPostgrest,
    fetchSingleFromPostgrest,
    patchToPostgrest,
    postToPostgrest,
} from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IPostgrestParams, IRelationship } from ***REMOVED***@/types/types***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

export const RELATIONSHIP_TABLE = ***REMOVED***relationship***REMOVED***

export const fetchRelationships = async ({
    params,
    queryString,
    token,
    signal,
}: {
    params?: IPostgrestParams
    queryString?: string
    token: string
    signal?: AbortSignal
}): Promise<IRelationship[]> => {
    const relationships = await fetchListFromPostgrest<IRelationship>({
        table: RELATIONSHIP_TABLE,
        params,
        queryString,
        token,
        signal,
    })
    return relationships
}

export const fetchRelationship = async ({
    uuid,
    params,
    token,
    signal,
}: {
    uuid: string
    params?: IPostgrestParams
    token: string
    signal?: AbortSignal
}): Promise<IRelationship> => {
    const relationship = await fetchSingleFromPostgrest<IRelationship>({
        table: RELATIONSHIP_TABLE,
        uuid,
        params,
        token,
        signal,
    })
    return relationship
}

export const fetchRelationshipRollup = async ({
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
        table: RELATIONSHIP_TABLE,
        rollupColumn: rollup,
        params: omit(params, [***REMOVED***order***REMOVED***]),
        token,
        signal,
    })
    return list
}

export const postRelationship = async ({
    relationship,
    token,
    signal,
}: {
    relationship: Omit<IRelationship, ***REMOVED***uuid***REMOVED***>
    token: string
    signal?: AbortSignal
}): Promise<IRelationship> => {
    const newRelationship = await postToPostgrest<Omit<IRelationship, ***REMOVED***uuid***REMOVED***>, IRelationship>({
        table: RELATIONSHIP_TABLE,
        body: relationship,
        token,
        signal,
    })
    return newRelationship
}

export const patchRelationship = async ({
    uuid,
    relationship,
    token,
    signal,
}: {
    uuid: string
    relationship: Partial<IRelationship>
    token: string
    signal?: AbortSignal
}): Promise<IRelationship> => {
    const newRelationship = await patchToPostgrest<IRelationship>({
        uuid,
        table: RELATIONSHIP_TABLE,
        body: relationship,
        token,
        signal,
    })
    return newRelationship
}

export const deleteRelationship = async ({
    uuid,
    token,
    signal,
}: {
    uuid: string
    token: string
    signal?: AbortSignal
}): Promise<void> => {
    await deleteFromPostgrest({
        table: RELATIONSHIP_TABLE,
        uuid,
        token,
        signal,
    })
}
