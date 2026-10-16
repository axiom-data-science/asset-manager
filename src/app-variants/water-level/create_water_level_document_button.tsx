import { utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { CreateDocumentEntryProps } from '@/variants/types'




const CreateWaterLevelDocumentButton = ({
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
            <ViewWithLoader isLoading={isLoading} error={error} data={data}>

                <div className='w-100'>
                    {data?.forms.map((form) => (
                        <Link
                            key={form.uuid}
                            to={{
                                pathname: `${documentCreatePath.replace(/\/$/, '')}/${form.object_type_uuid}/object_type/${form.uuid}/form`,
                                search: new URLSearchParams({
                                    returnToOnSuccess,
                                    skip_tabs: 'true'
                                }).toString(),
                            }}
                            className={utils.createButtonClass({ size: 'md', variant: 'default' })}
                        >
                            Create a water level metadata record
                        </Link>

                    ))}
                </div>

            </ViewWithLoader >

        </>
    )
}
export default CreateWaterLevelDocumentButton
