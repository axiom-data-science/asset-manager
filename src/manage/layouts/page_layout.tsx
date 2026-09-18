import { FormCreator, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms"
import { Button } from "@axdspub/axiom-ui-utilities"
import { Loader } from "lucide-react"
import type { ReactElement, ReactNode } from "react"


export const ManagePageLayout = ({ children, title }: { children: ReactNode, title: ReactNode }): ReactElement => {
    return (
        <div className=***REMOVED***flex flex-col gap-4***REMOVED***>
            <h1 className=***REMOVED***text-2xl font-bold***REMOVED***>{title}</h1>
            {children}
        </div>
    )
}

const ManageFormPageLayout = ({ form, formValueState, onSave, saving, title }: { form: IForm, onSave: () => void, saving: boolean, formValueState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>], title: ReactNode }): ReactElement => {

    return (
        <ManagePageLayout title={title}>
            <FormCreator form={form} formValueState={formValueState} />
            <div>
                <Button onClick={onSave} type=***REMOVED***default***REMOVED*** disabled={saving}>{saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}</Button>
            </div>
        </ManagePageLayout>
    )
}

export default ManageFormPageLayout