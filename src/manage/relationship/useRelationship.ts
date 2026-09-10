import { useAuth } from '@/auth/useAuth'
import { fetchPredicates } from '@/manage/document/services'
import { fetchDocuments } from '@/manage/document/services'
import { fetchRelationship } from '@/manage/relationship/services'
import { queryOptions, useQuery } from '@tanstack/react-query'

export const relationshipQueryKey = (uuid: string) => ['relationship', uuid]

export const getRelationshipWithLookupsQuery = ({
    uuid,
    token,
}: {
    uuid: string
    token?: string
}) => {
    return queryOptions({
        queryKey: relationshipQueryKey(uuid),
        queryFn: async ({ signal }) => {
            const [relationship, documents, predicates] = await Promise.all([
                fetchRelationship({ uuid, token: token ?? '', signal }),
                fetchDocuments({
                    params: {
                        select: ['uuid', 'label'],
                        order: [{ column: 'label', dir: 'asc' }],
                        limit: 500,
                    },
                    token: token ?? '',
                    signal,
                }).then((list) => list.map((d) => ({ uuid: d.uuid, label: d.label }))),
                fetchPredicates({
                    params: {
                        order: [{ column: 'label', dir: 'asc' }],
                        limit: 500,
                    },
                    signal,
                }),
            ])

            return {
                relationship,
                documents,
                predicates,
            }
        },
    })
}

export const useRelationshipWithLookups = ({ uuid }: { uuid: string }) => {
    const auth = useAuth()
    const queryResult = useQuery(
        getRelationshipWithLookupsQuery({
            uuid,
            token: auth.user?.access_token,
        })
    )
    return queryResult
}
