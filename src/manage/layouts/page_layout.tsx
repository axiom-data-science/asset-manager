import { FormCreator, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms"
import { Button } from "@axdspub/axiom-ui-utilities"
import { Loader } from "lucide-react"
import type { ReactElement, ReactNode } from "react"


export const ManagePageLayout = ({ children, title }: { children: ReactNode, title: ReactNode }): ReactElement => {
    return (
        <div className='flex flex-col gap-4'>
            <h1 className='text-2xl font-bold'>{title}</h1>
            {children}
        </div>
    )
}

const ManageFormPageLayout = ({ form, formValueState, onSave, saving, title }: { form: IForm, onSave: () => void, saving: boolean, formValueState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>], title: ReactNode }): ReactElement => {

    return (
        <ManagePageLayout title={title}>
            <FormCreator form={form} formValueState={formValueState} />
            <div>
                <Button onClick={onSave} type='primary' disabled={saving}>{saving ? <Loader className="animate-spin" /> : 'Save'}</Button>
            </div>
        </ManagePageLayout>
    )
}

export default ManageFormPageLayout