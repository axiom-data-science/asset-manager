import { utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { CreateDocumentEntryProps } from '@/variants/types'

const WaterLevelEntry = ({
    returnToOnSuccess = '/create-document-success',
    documentCreatePath = '/create-document',
}: CreateDocumentEntryProps = {}): ReactElement => {
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        form_params: {
            filters: [{ column: 'slug', operator: 'eq', value: 'water_level' }],
        },
    })

    return (
        <>
            <h2 className="text-2xl font-bold mb-4">Water Level</h2>
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>
                {data?.forms.map((form) => (
                    <Link
                        key={form.uuid}
                        to={{
                            pathname: `${documentCreatePath.replace(/\/$/, '')}/${form.object_type_uuid}/object_type/${form.uuid}/form`,
                            search: new URLSearchParams({
                                returnToOnSuccess,
                            }).toString(),
                        }}
                        className={utils.createButtonClass({ size: 'md', variant: 'default' })}
                    >
                        Create a water level metadata record
                    </Link>
                ))}
            </ViewWithLoader>
        </>
    )
}
export default WaterLevelEntry
