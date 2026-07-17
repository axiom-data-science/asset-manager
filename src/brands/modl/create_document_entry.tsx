import { useObjectTypesAndFormsAndSchemas } from "@/manage/object_type/useObjectTypeList";
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

export const MODLCreateDocumentEntry = ({
    returnToOnSuccess,
    documentCreatePath = ***REMOVED***/document/create***REMOVED***
}: {
    returnToOnSuccess?: string
    documentCreatePath?: string
}): ReactElement => {
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        object_type_params: {
            filters: [
                {
                    column: ***REMOVED***slug***REMOVED***,
                    operator: ***REMOVED***eq***REMOVED***,
                    value: ***REMOVED***modl***REMOVED***,
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
                        <div className=***REMOVED***flex flex-row gap-4***REMOVED*** key={type.uuid}>
                            {forms.map((form) => {
                                return (
                                    <div key={form.uuid} className=***REMOVED***flex flex-col gap-2***REMOVED***>
                                        <Link to={`${documentCreatePath.replace(/\/$/, ***REMOVED******REMOVED***)}/${type.uuid}/object_type/${form.uuid}/form${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ***REMOVED******REMOVED***}`} className=***REMOVED***bg-[#003087] text-white px-4 py-2 rounded-md hover:bg-[#0056b3] transition-colors duration-300***REMOVED***>
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