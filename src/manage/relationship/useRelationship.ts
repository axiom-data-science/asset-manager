import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { fetchPredicates } from ***REMOVED***@/manage/document/services***REMOVED***
import { fetchDocuments } from ***REMOVED***@/manage/document/services***REMOVED***
import { fetchRelationship } from ***REMOVED***@/manage/relationship/services***REMOVED***
import { queryOptions, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

export const relationshipQueryKey = (uuid: string) => [***REMOVED***relationship***REMOVED***, uuid]

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
                fetchRelationship({ uuid, token: token ?? ***REMOVED******REMOVED***, signal }),
                fetchDocuments({
                    params: {
                        select: [***REMOVED***uuid***REMOVED***, ***REMOVED***label***REMOVED***],
                        order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
                        limit: 500,
                    },
                    token: token ?? ***REMOVED******REMOVED***,
                    signal,
                }).then((list) => list.map((d) => ({ uuid: d.uuid, label: d.label }))),
                fetchPredicates({
                    params: {
                        order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
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
