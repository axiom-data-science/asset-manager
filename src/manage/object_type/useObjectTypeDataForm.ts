import { schemaToFormUtils, type IForm, type IFormOverride, type IFormValues } from "@axdspub/axiom-ui-forms"
import type { JSONSchema6 } from "json-schema"

import { omit } from "lodash"
import { useFormAndFormState } from "@/manage/components/useFormAndFormState"
import { useAtom } from "jotai"
import contextStateAtom from "@/state/contextStateAtom"

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

    const [contextState] = useAtom(contextStateAtom)

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
                    {
                        "id": "expected_child_type_overview_wrapper",
                        "type": "objectWrapper",
                        "label": "Overview",
                        "fields": [
                            { "prop": "expected_child_types.label", "type": "text" },
                            { "prop": "expected_child_types.description", "type": "long_text" },
                            { "prop": "expected_child_types.precedence" },
                            { "prop": "expected_child_types.single", "type": "boolean" }
                        ],
                        "settings": {
                            "boldLabel": true,
                            "className": "bg-transparent px-0"
                        }

                    }, {
                        "id": "predicate_wrapper",
                        "label": "Predicate selection",
                        "type": "objectWrapper",
                        "layout": "grid2",
                        "fields": [
                            { "prop": "expected_child_types.predicate", "label": "To child predicate", "type": "select", "options": contextState.predicate.map(p => ({ label: p.label, value: p.predicate })) },
                            { "prop": "expected_child_types.to_parent_predicate", "type": "select", "options": contextState.predicate.map(p => ({ label: p.inverse_label ?? p.label, value: p.predicate })) }
                        ],
                        "settings": {
                            "boldLabel": true,
                            "className": "bg-transparent px-0"
                        }
                    },
                    {
                        "id": "expected_child_type_query_wrapper",
                        "type": "objectWrapper",
                        "label": "Query",
                        "description": "Use slug to select a single object type. Use query (`slug=ilike.%partially_matching_value%`) to match multiple object types. If both are filled, slug will be used.",
                        "settings": {
                            "boldLabel": true,
                            "className": "bg-transparent px-0"
                        },
                        "fields": [
                            { "prop": "expected_child_types.object_type_slug", "type": "select", "options": contextState.object_type.map(ot => ({ label: `${ot.label} (${ot.slug})`, value: ot.slug })) },
                            { "prop": "expected_child_types.object_type_query", "type": "text" }
                        ]
                    }

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