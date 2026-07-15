import { createFilterForSaveFn } from "@/lib/utils"
import { type IForm, type IFormValues } from "@axdspub/axiom-ui-forms"
import { useState } from "react"

export const useFormAndFormState = ({
    form,
    initialFormValues,
    presentationFields
}: {
    form: IForm,
    initialFormValues?: IFormValues,
    presentationFields?: string[]
}): {
    form: IForm,
    formState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>],
    filterForSave: (formValues: IFormValues) => IFormValues
} => {


    const [formValues, setFormValues] = useState<IFormValues>({
        ...initialFormValues
    });

    const filterForSave = createFilterForSaveFn(presentationFields);

    return {
        form: form,
        formState: [formValues, setFormValues],
        filterForSave
    }



}