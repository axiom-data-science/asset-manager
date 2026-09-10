import {
    deleteFromPostgrest,
    fetchListFromPostgrest,
    fetchRollupFromPostgrest,
    fetchSingleFromPostgrest,
    patchToPostgrest,
    postToPostgrest,
} from '@/services/postgrest/services'
import type { IPostgrestParams, IRelationship } from '@/types/types'
import { omit } from 'lodash-es'

export const RELATIONSHIP_TABLE = 'relationship'

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
        params: omit(params, ['order']),
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
    relationship: Omit<IRelationship, 'uuid'>
    token: string
    signal?: AbortSignal
}): Promise<IRelationship> => {
    const newRelationship = await postToPostgrest<Omit<IRelationship, 'uuid'>, IRelationship>({
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
