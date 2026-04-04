import { FormCreator, Inputs, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Checkbox } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";


const FormWrap = ({ form, formValueState }: { form: IForm, formValueState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>] }): ReactElement => {

    return (
        <FormCreator
            form={form}
            formValueState={formValueState}
            inputOverrides={{
                'custom:slug': (props): ReactElement => {
                    const [autoMakeSlug, setAutoMakeSlug] = useState(true);
                    const [formValues] = formValueState

                    const label = formValues['label'] as string | undefined;
                    const slug = autoMakeSlug
                        ? label ? label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') : ''
                        : (formValues['slug'] as string | undefined) ?? '';


                    return <div className='flex flex-col gap-1'>
                        <Inputs.TextInput {...props} disabled={autoMakeSlug} value={slug} />
                        <Checkbox id='auto-make-slug' testId="auto-make-slug" size="xs" label='Auto-generate slug from label' value={autoMakeSlug} onChange={setAutoMakeSlug} />
                    </div>

                }
            }}

        />
    )
}

export default FormWrap