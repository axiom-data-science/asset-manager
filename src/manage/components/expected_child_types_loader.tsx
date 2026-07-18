import { fetchObjectTypes } from "@/manage/object_type/services"
import type { IObjectType, IDocument, IHydratedExpectedChildType } from "@/types/types"
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"
import { useAuth } from "react-oidc-context"


const ExpectedChildTypeLoader = ({
    parentDocument,
    objectType,
    View,
}: {
    parentDocument?: IDocument<unknown>
    objectType: IObjectType,
    View: React.FC<{
        parentDocument?: IDocument<unknown>,
        objectType: IObjectType,
        expectedChildTypes?: IHydratedExpectedChildType[]
    }>
}): ReactElement => {
    const auth = useAuth()
    const expectedChildTypes = objectType.data?.expected_child_types ?? []

    const { data, isLoading, error } = useQuery({
        queryKey: [***REMOVED***expected-child-types***REMOVED***, objectType.uuid],
        queryFn: async () => {
            const childTypes = await Promise.all(
                expectedChildTypes.map(async (ect) => {
                    if (ect.object_type_slug || ect.object_type_query) {

                        const childObjectTypes = await fetchObjectTypes({
                            params: ect.object_type_slug ? { filters: [{ column: ***REMOVED***slug***REMOVED***, operator: ***REMOVED***eq***REMOVED***, value: ect.object_type_slug }] } : undefined,
                            queryString: ect.object_type_query,
                            token: auth.user?.access_token ?? ***REMOVED******REMOVED***
                        })

                        return {
                            ...ect,
                            object_types: childObjectTypes
                        }
                    }
                })
            )
            return childTypes.filter((ect) => ect !== undefined) as IHydratedExpectedChildType[]
        },
    })


    if (expectedChildTypes.length === 0) {
        return <View parentDocument={parentDocument} objectType={objectType} />
    }

    return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {
            data && <View parentDocument={parentDocument} objectType={objectType} expectedChildTypes={data} />
        }
    </ViewWithLoader>

}
export default ExpectedChildTypeLoader