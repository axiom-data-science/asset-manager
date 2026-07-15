import { schemaToFormUtils, type IForm, type IFormOverride, type IFormValues } from "@axdspub/axiom-ui-forms"
import type { JSONSchema6 } from "json-schema"

import { omit } from "lodash"
import { useFormAndFormState } from "@/manage/components/useFormAndFormState"

export const useObjectTypeDataForm = ({
    objectTypeSchema,
    initialFormValues,
    presentationFields
}: {
    objectTypeSchema: JSONSchema6,
    initialFormValues?: IFormValues,
    presentationFields?: string[]
}): {
    form: IForm
    formState: [IFormValues, React.Dispatch<React.SetStateAction<IFormValues>>],
    filterForSave: (formValues: IFormValues) => IFormValues
} => {

    const objectTypeConfigFormOverride: IFormOverride = {
        fields: [
            {
                "prop": "field_mappings",
                "description": "Provide a JSON path from data object to document field location",
                "type": "object",
                "layout": "grid2",
                "fields": [
                    { "prop": "field_mappings.slug", "type": "text" },
                    { "prop": "field_mappings.label", "type": "text" },
                    { "prop": "field_mappings.description", "type": "text" },
                    { "prop": "field_mappings.asset_geom", "type": "text" },
                    { "prop": "field_mappings.dataset_extent_geom", "type": "text" },
                    { "prop": "field_mappings.dataset_start_time", "type": "text" },
                    { "prop": "field_mappings.dataset_end_time", "type": "text" }
                ]
            },
            {
                "prop": "expected_child_types",
                "type": "object",
                "multiple": true,
                "label": "Expected child types",
                "fields": [
                    { "prop": "label", "type": "text" },
                    { "prop": "description", "type": "long_text" },
                    { "prop": "object_type_slug", "type": "text" },
                    { "prop": "object_type_query", "type": "text" },
                    { "prop": "single", "type": "boolean" }
                ]

            }
        ]
    }

    const form = schemaToFormUtils.overridesAndSchemaToFormObject({
        schema: objectTypeSchema,
        formOverrides: [objectTypeConfigFormOverride],
        formFieldOverrides: []
    })

    form.settings = {
        ...form.settings
    }
    form.settings.show_progress = false


    const formObject = useFormAndFormState({
        form: omit(form, [***REMOVED***label***REMOVED***]),
        initialFormValues: initialFormValues,
        presentationFields: presentationFields
    })
    return formObject
}