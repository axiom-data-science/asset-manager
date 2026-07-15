import { createFilterForSaveFn } from "@/lib/utils";
import type { IForm, IFormValues, IObjectField } from "@axdspub/axiom-ui-forms";
import { useMemo, useState } from "react";

export const useSlug = ({
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
        ***REMOVED***auto_slug***REMOVED***: true,
        ...initialFormValues
    });


    useMemo(() => {
        const updateSlug = () => {
            const autoSlug = Boolean(formValues.auto_slug);
            const label = formValues.label as string | undefined;
            if (autoSlug && label !== undefined) {
                const slug = label.toLowerCase().replace(/\s+/g, ***REMOVED***-***REMOVED***).replace(/[^a-z0-9-]/g, ***REMOVED******REMOVED***);
                setFormValues(prev => ({ ...prev, slug }));
            }
        }

        updateSlug();
    }, [formValues.label, formValues.auto_slug])


    const newForm = {
        ...form
    }
    const fields = newForm.fields ?? []
    const labelFieldIndex = fields.findIndex(f => f.id === ***REMOVED***label***REMOVED***);
    const labelField = fields[labelFieldIndex]


    const filterForSave = createFilterForSaveFn(presentationFields);


    if (labelFieldIndex === -1 || labelField === undefined) {
        console.warn(***REMOVED***useSlug hook requires a field with id "label" to generate slug***REMOVED***);
        return {
            form: newForm,
            formState: [formValues, setFormValues],
            filterForSave
        }
    }
    const slugFieldIndex = fields.findIndex(f => f.id === ***REMOVED***slug***REMOVED***);
    const slugField = fields[slugFieldIndex] ?? {
        id: ***REMOVED***slug***REMOVED***,
        label: ***REMOVED***Slug***REMOVED***,
        type: ***REMOVED***text***REMOVED***,
        required: true,
    }

    slugField.conditions = {
        field: ***REMOVED***auto_slug***REMOVED***,
        value: true,
        operator: ***REMOVED***eq***REMOVED***,
        result: ***REMOVED***disable***REMOVED***
    }

    const slugObjectField: IObjectField = {
        id: ***REMOVED***slug-wrap***REMOVED***,
        type: ***REMOVED***object***REMOVED***,
        skip_path: true,
        fields: [
            slugField,
            {
                id: ***REMOVED***auto_slug***REMOVED***,
                label: ***REMOVED***Auto-generate slug from label***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***
            }
        ]
    }

    newForm.fields = fields.filter(f => f.id !== ***REMOVED***slug***REMOVED*** && f.id !== ***REMOVED***auto_slug***REMOVED*** && f.id !== ***REMOVED***auto-slug***REMOVED*** && f.id !== ***REMOVED***slug-wrap***REMOVED***);
    newForm.fields.splice(labelFieldIndex + 1, 0, slugObjectField)

    return {
        form: newForm,
        formState: [formValues, setFormValues],
        filterForSave
    };

}