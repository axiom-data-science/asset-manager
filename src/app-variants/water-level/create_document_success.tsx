import { useDocumentAndObjectTypeAndObjectTypeConfig } from '@/manage/document/useDocument'
import ButtonLink from '@/manage/components/button_link'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'

const WaterLevelCreateDocumentSuccess = (): ReactElement => {
    const [searchParams] = useSearchParams()
    const uuid = searchParams.get('uuid')
    const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid)

    if (!uuid) {
        return <div>Invalid document ID</div>
    }

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data?.document && (
                <div className="flex flex-col items-center gap-6 p-10 text-center">
                    <h1 className="text-2xl font-medium">Water level document created</h1>
                    <div className="flex flex-wrap justify-center gap-4">
                        <ButtonLink to={`/document/edit/${uuid}`}>
                            Edit this document
                        </ButtonLink>
                        <ButtonLink
                            variant="secondary"
                            to={`/document?${new URLSearchParams({
                                owner_sub: data.document.owner_sub,
                                object_type_uuid: data.document.object_type_uuid,
                            }).toString()}`}
                        >
                            Show all documents
                        </ButtonLink>
                    </div>
                </div>
            )}
        </ViewWithLoader>
    )
}

export default WaterLevelCreateDocumentSuccess
