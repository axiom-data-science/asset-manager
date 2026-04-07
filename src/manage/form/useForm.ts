import { useAuth } from "@/auth/useAuth"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchForm } from "./services"
import { useCombinedQueries } from "@/hooks/use-combined-queries"
import { getObjectTypeListQuery } from "@/manage/object_type/useObjectTypeList"

export const formQueryKey = (uuid?: string) => ['form', uuid]
export const formWithLookupsQueryKey = (uuid?: string) => ['form', 'object-types', uuid]

export const getFormQuery = ({uuid, token}: {uuid?: string, token?: string}) => {
    return queryOptions({
        queryKey: formQueryKey(uuid),
        enabled: !!uuid && !!token && uuid !== '',
        queryFn: async ({ signal }) => {
            
            const objectSchema = await fetchForm({
                uuid: uuid ?? 'NA',
                signal,
                token: token ?? ''
            })

            return objectSchema
            
        }
    })
}

export const useForm = (uuid?: string) => {
    const auth = useAuth()
    const queryResult = useQuery(getFormQuery({ uuid, token: auth.user?.access_token }))
    return queryResult
}

export const  useFormWithLookups = ({uuid}: {uuid?: string}) => {
    const auth = useAuth()
    const queryObjects = {
        form: getFormQuery({uuid, token: useAuth().user?.access_token}),
        object_types: getObjectTypeListQuery({token: auth.user?.access_token})
    }   

    return useCombinedQueries(queryObjects)

}
