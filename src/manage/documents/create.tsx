import { Button, Loader } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";
import { useParams } from "react-router-dom"

const CreateDocument = (): ReactElement => {
    const params = useParams();
    const type = params.type;
    const version = params.version;
    const [saving, setSaving] = useState(false);

    const onSave = () => {
        
    }

    return (
            <div>
                <h1>Create Document</h1>
                <p>Type: {type}</p>
                <p>Version: {version}</p>
                {
                    saving ? <div className=***REMOVED***absolute top-0 left-0 w-full h-full bg-white/50 flex items-center justify-center***REMOVED***>
                        <Loader className=***REMOVED***pt-10***REMOVED*** />
                    </div> : <Button onClick={() => setSaving(true)}>Save</Button>
                }
            </div>
        )
}

export default CreateDocument