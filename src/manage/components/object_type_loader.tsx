import { utils, ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { Link, useSearchParams } from "react-router-dom";
import { useObjectTypeList } from "@/manage/object_type/useObjectTypeList";
import type { ReactElement } from "react";
import type { IObjectType } from "@/types/types";

const ObjectTypeLoader = ({
    urlRoot,
    View
}:{
    urlRoot: string,
    View: ({type}: {type:IObjectType}) => ReactElement
}): ReactElement => {
    const [params] = useSearchParams();
    const objectType = params.get(***REMOVED***object_type***REMOVED***);
    const { data: object_types, isLoading, error } = useObjectTypeList()
    const typeMap = Object.fromEntries(object_types?.map((ot) => [ot.uuid, ot]) ?? [])
    const selectedType = objectType ? typeMap[objectType] : null;
    return <ViewWithLoader isLoading={isLoading} error={error} data={object_types}>
        {object_types && (
            selectedType === null || selectedType === undefined
                ? <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                    <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>Select document type</h1>

                    {object_types.length === 0 && <>
                        <p>No object types found. Please create an object type first.</p>
                        <div className=***REMOVED***mt-4***REMOVED***><Link to=***REMOVED***/object_type/create***REMOVED*** className={utils.createButtonClass({
                            size: ***REMOVED***md***REMOVED***,
                            variant: ***REMOVED***primary***REMOVED***
                        })}>Create object type</Link>
                        </div>
                    </>}
                    <div className=***REMOVED***flex flex-col gap-2 max-w-70***REMOVED***>
                        {object_types.map((ot) => (
                            <Link key={ot.uuid} to={`${urlRoot}?object_type=${ot.uuid}`} className=***REMOVED***items-start justify-normal p-2 border rounded hover:bg-gray-100***REMOVED***>{ot.label}</Link>
                        ))}
                    </div>
                </div>
                : <View type={selectedType} />
        )
        }
    </ViewWithLoader>
}

export default ObjectTypeLoader