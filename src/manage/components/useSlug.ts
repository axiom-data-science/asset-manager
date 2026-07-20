import { createFilterForSaveFn } from "@/lib/utils";
import type { IForm, IFormValues, IObjectField } from "@axdspub/axiom-ui-forms";
import { get } from "lodash-es";
import { useMemo, useState } from "react";

export const useSlug = ({
    form,
    initialFormValues,
    presentationFields,
    labelPath = 'label',
    autoSlug
}: {
    form: IForm,
    initialFormValues?: IFormValues,
    presentationFields?: string[],
    labelPath?: string,
    autoSlug?: boolean
}): {
    form: IForm,
    formState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>],
    filterForSave: (formValues: IFormValues) => IFormValues
} => {
    const [formValues, setFormValues] = useState<IFormValues>({
        'auto_slug': true,
        ...initialFormValues
    });

    const labelValue = get(formValues, labelPath) as string | undefined;
    const autoSlugValue = formValues.auto_slug;

    useMemo(() => {
        const updateSlug = () => {
            const useAutoSlug = Boolean(autoSlug ?? autoSlugValue);
            if (useAutoSlug && labelValue !== undefined) {
                const slug = labelValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setFormValues(prev => ({ ...prev, slug }));
            }
        }

        updateSlug();
    }, [labelValue, autoSlug, autoSlugValue]);


    const newForm = {
        ...form
    }
    const fields = newForm.fields ?? []
    const labelFieldIndex = fields.findIndex(f => f.id === 'label');
    const labelField = fields[labelFieldIndex]


    const filterForSave = createFilterForSaveFn(presentationFields);


    if (labelFieldIndex === -1 || labelField === undefined) {
        console.warn('useSlug hook requires a field with id "label" to generate slug');
        return {
            form: newForm,
            formState: [formValues, setFormValues],
            filterForSave
        }
    }
    const slugFieldIndex = fields.findIndex(f => f.id === 'slug');
    const slugField = fields[slugFieldIndex] ?? {
        id: 'slug',
        label: 'Slug',
        type: 'text',
        required: true,
    }

    slugField.conditions = {
        field: 'auto_slug',
        value: true,
        operator: 'eq',
        result: 'disable'
    }

    const slugObjectField: IObjectField = {
        id: 'slug-wrap',
        type: 'object',
        skip_path: true,
        fields: [
            slugField,
            {
                id: 'auto_slug',
                label: 'Auto-generate slug from label',
                type: 'boolean'
            }
        ]
    }

    newForm.fields = fields.filter(f => f.id !== 'slug' && f.id !== 'auto_slug' && f.id !== 'auto-slug' && f.id !== 'slug-wrap');
    newForm.fields.splice(labelFieldIndex + 1, 0, slugObjectField)

    return {
        form: newForm,
        formState: [formValues, setFormValues],
        filterForSave
    };

}