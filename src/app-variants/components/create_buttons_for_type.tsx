import { utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { CreateDocumentEntryProps } from '@/variants/types'
import { useAtom } from 'jotai'
import contextStateAtom from '@/state/contextStateAtom'




const CreateButtonsForType = ({
    returnToOnSuccess = '/create-document-success',
    documentCreatePath = '/create-document',
    objectTypeSlug,
}: CreateDocumentEntryProps & { objectTypeSlug: string }): ReactElement => {
    const [context] = useAtom(contextStateAtom)
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        form_params: {
            filters: [{ column: 'slug', operator: 'eq', value: objectTypeSlug }],
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
                                }).toString(),
                            }}
                            className={utils.createButtonClass({ size: 'md', variant: 'default' })}
                        >
                            {
                                data.forms.length > 1 ? form.label : `Create a ${context.object_type_by_uuid[form.object_type_uuid].label} metadata record`
                            }
                        </Link>

                    ))}
                </div>

            </ViewWithLoader >

        </>
    )
}
export default CreateButtonsForType
