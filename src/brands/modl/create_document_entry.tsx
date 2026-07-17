import { useObjectTypesAndFormsAndSchemas } from "@/manage/object_type/useObjectTypeList";
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

export const MODLCreateDocumentEntry = ({
    returnToOnSuccess,
    documentCreatePath = '/document/create'
}: {
    returnToOnSuccess?: string
    documentCreatePath?: string
}): ReactElement => {
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        object_type_params: {
            filters: [
                {
                    column: 'slug',
                    operator: 'eq',
                    value: 'modl',
                }
            ]
        },
    })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data &&
                data.object_types.map((type) => {
                    const forms = data.forms.filter((f) => f.object_type_uuid === type.uuid)
                    return (
                        <div className='flex flex-row gap-4' key={type.uuid}>
                            {forms.map((form) => {
                                return (
                                    <div key={form.uuid} className='flex flex-col gap-2'>
                                        <Link to={`${documentCreatePath.replace(/\/$/, '')}/${type.uuid}/object_type/${form.uuid}/form${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ''}`} className='bg-[#003087] text-white px-4 py-2 rounded-md hover:bg-[#0056b3] transition-colors duration-300'>
                                            Create {form.label}
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
        </ViewWithLoader>
    )


}