import type { IForm, IFormValues, IObjectField } from "@axdspub/axiom-ui-forms";
import { useMemo, useState } from "react";

export const useSlug = (form: IForm, initialFormValues?: IFormValues, presentationFields?: string[]): {form: IForm, formState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>], filterForSave: (formValues: IFormValues) => IFormValues} => {
    const [formValues, setFormValues] = useState<IFormValues>({
        'auto_slug': true,
        ...initialFormValues
    });
    

    useMemo(() => {
        const updateSlug = () => {
            const autoSlug = Boolean(formValues['auto_slug']);
            const label = formValues['label'] as string | undefined;
            if (autoSlug && label !== undefined) {
                const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setFormValues(prev => ({ ...prev, slug }));
            }
        }

        updateSlug();
    }, [formValues.label, formValues.auto_slug])


    const newForm = {
        ...form
    }
    const fields = newForm.fields ?? []
    const labelFieldIndex = fields.findIndex(f => f.id === 'label');
    const labelField = fields[labelFieldIndex]


    const filterForSave = (values: IFormValues): IFormValues => {
        const valuesToSave = {} as IFormValues;
        Object.keys(values).forEach(key => {
            if(key === 'auto_slug') return;
            if(presentationFields && presentationFields.includes(key)) return;
            valuesToSave[key] = values[key];
        })
        return valuesToSave;
    }


    if(labelFieldIndex === -1 || labelField === undefined) {
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