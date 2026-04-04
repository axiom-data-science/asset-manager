import { FormCreator, Inputs, type IForm, type IFormValues } from "@axdspub/axiom-ui-forms";
import { Checkbox } from "@axdspub/axiom-ui-utilities";
import { useState, type ReactElement } from "react";


const FormWrap = ({ form, formValueState }: { form: IForm, formValueState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>] }): ReactElement => {

    return (
        <FormCreator
            form={form}
            formValueState={formValueState}
            inputOverrides={{
                ***REMOVED***custom:slug***REMOVED***: (props): ReactElement => {
                    const [autoMakeSlug, setAutoMakeSlug] = useState(true);
                    const [formValues] = formValueState

                    const label = formValues[***REMOVED***label***REMOVED***] as string | undefined;
                    const slug = autoMakeSlug
                        ? label ? label.trim().toLowerCase().replace(/\s+/g, ***REMOVED***-***REMOVED***).replace(/[^a-z0-9\-]/g, ***REMOVED******REMOVED***) : ***REMOVED******REMOVED***
                        : (formValues[***REMOVED***slug***REMOVED***] as string | undefined) ?? ***REMOVED******REMOVED***;


                    return <div className=***REMOVED***flex flex-col gap-1***REMOVED***>
                        <Inputs.TextInput {...props} disabled={autoMakeSlug} value={slug} />
                        <Checkbox id=***REMOVED***auto-make-slug***REMOVED*** testId="auto-make-slug" size="xs" label=***REMOVED***Auto-generate slug from label***REMOVED*** value={autoMakeSlug} onChange={setAutoMakeSlug} />
                    </div>

                }
            }}

        />
    )
}

export default FormWrap