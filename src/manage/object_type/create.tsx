import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FormCreator, schemaToFormUtils, type IForm, type IFormOverride } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectType } from ***REMOVED***@/manage/object_type/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { useNavigate, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import type { IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { postObjectSchema } from ***REMOVED***@/manage/object_schema/services***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import { useSlug } from ***REMOVED***@/manage/components/useSlug***REMOVED***
import { useObjectTypeSchemaAndObjectCategories } from ***REMOVED***@/manage/object_type/useObjectType***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***

const CreateObjectTypeForm = ({
  object_categories,
  schema
}: {
  object_categories: string[],
  schema: JSONSchema6
}): ReactElement => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [errorMessages, setErrorMessages] = useState<{ field: string; message: string }[]>([])
  const auth = useAuth()

  const objectTypeConfigFormOverride: IFormOverride = {
    fields: [
      {
        "prop": "data.field_mappings",
        "description": "Provide a JSON path to field location",
        "type": "object",
        "layout": "grid2",
        "fields": [
          { "prop": "data.field_mappings.slug", "type": "text" },
          { "prop": "data.field_mappings.label", "type": "text" },
          { "prop": "data.field_mappings.description", "type": "text" },
          { "prop": "data.field_mappings.asset_geom", "type": "text" },
          { "prop": "data.field_mappings.dataset_extent_geom", "type": "text" },
          { "prop": "data.field_mappings.dataset_start_time", "type": "text" },
          { "prop": "data.field_mappings.dataset_end_time", "type": "text" }
        ]
      },
      {
        "prop": "data.api_overrides"
      }
    ]
  }

  const objectTypeConfigForm = schemaToFormUtils.overridesAndSchemaToFormObject({
    schema,
    formOverrides: [objectTypeConfigFormOverride],
    formFieldOverrides: []
  })

  const objectTypeFormWithoutSlug: IForm = {
    id: ***REMOVED***create-object-type***REMOVED***,
    settings: {
      show_progress: false,
    },
    tabs: [
      {
        id: ***REMOVED***general***REMOVED***,
        label: ***REMOVED***General***REMOVED***,
        fields: [
          {
            id: ***REMOVED***category***REMOVED***,
            label: ***REMOVED***Category***REMOVED***,
            type: ***REMOVED***select***REMOVED***,
            options: object_categories.map((c) => {
              return { label: c, value: c }
            }),
            required: true,
            settings: {},
          },
          {
            id: ***REMOVED***label***REMOVED***,
            label: ***REMOVED***Label***REMOVED***,
            type: ***REMOVED***text***REMOVED***,
            required: true,
          },
          {
            id: ***REMOVED***description***REMOVED***,
            label: ***REMOVED***Description***REMOVED***,
            type: ***REMOVED***long_text***REMOVED***,
          },
          {
            id: ***REMOVED***create_default_schema***REMOVED***,
            label: ***REMOVED***Create default schema***REMOVED***,
            type: ***REMOVED***boolean***REMOVED***,
          },
        ]
      },
      {
        id: ***REMOVED***config***REMOVED***,
        label: ***REMOVED***Config***REMOVED***,
        fields: objectTypeConfigForm.fields
      }

    ],
  }

  const schemaFormWithoutSlug: IForm = {
    id: ***REMOVED***create-object-type***REMOVED***,
    settings: {
      show_progress: false,
    },
    fields: [
      {
        id: ***REMOVED***label***REMOVED***,
        label: ***REMOVED***Label***REMOVED***,
        type: ***REMOVED***text***REMOVED***,
        required: true,
      },
      {
        id: ***REMOVED***description***REMOVED***,
        label: ***REMOVED***Description***REMOVED***,
        type: ***REMOVED***long_text***REMOVED***,
      },
      {
        id: ***REMOVED***json_schema***REMOVED***,
        label: ***REMOVED***Schema (JSON)***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
        required: true,
      },
    ],
  }

  const {
    form,
    formState: [formValue, setFormValue],
    filterForSave,
  } = useSlug(
    objectTypeFormWithoutSlug,
    {
      category:
        object_categories.find((c) => c === searchParams.get(***REMOVED***category***REMOVED***)) ??
        object_categories.find((d) => d.toLowerCase() === ***REMOVED***document***REMOVED***) ??
        object_categories[0],
      create_default_schema: true,
    },
    [***REMOVED***create_default_schema***REMOVED***]
  )

  const {
    form: schemaForm,
    formState: [schemaFormValue, setSchemaFormValue],
    filterForSave: schemaFilterForSave,
  } = useSlug(schemaFormWithoutSlug)

  const onSave = async () => {
    setSaving(true)
    try {
      const typeValid = await validate({ form, formValues: formValue })
      const schemaValid = formValue[***REMOVED***create_default_schema***REMOVED***]
        ? await validate({
          form: schemaForm,
          formValues: schemaFormValue,
          messagePrefix: ***REMOVED***Default schema***REMOVED***,
          schemaFields: [***REMOVED***json_schema***REMOVED***],
        })
        : { valid: true, errors: [] }
      const valid = {
        valid: typeValid.valid && schemaValid.valid,
        errors: [...typeValid.errors, ...schemaValid.errors],
      }
      if (!valid.valid) {
        setSaving(false)
        setErrorMessages(valid.errors)
        window.scrollTo({
          top: 0,
          behavior: ***REMOVED***smooth***REMOVED***, // Adds a gradual animation
        })
        return
      }
      setErrorMessages([])
      const valuesToSave = filterForSave(formValue)
      const newObjectType = await postObjectType({
        object_type: valuesToSave as Omit<IObjectType, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })
      if (formValue[***REMOVED***create_default_schema***REMOVED***]) {
        const schemaValuesToSave = schemaFilterForSave(schemaFormValue)
        schemaValuesToSave[***REMOVED***object_type_uuid***REMOVED***] = newObjectType.uuid
        schemaValuesToSave[***REMOVED***is_type_default***REMOVED***] = true
        await postObjectSchema({
          object_schema: schemaValuesToSave as Omit<
            IObjectSchema,
            ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***
          >,
          token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        })
      }
      setSaving(false)
      navigate(***REMOVED***/object_type***REMOVED***)
    } catch (e: unknown) {
      setSaving(false)
      setErrorMessages([
        {
          field: ***REMOVED***form***REMOVED***,
          message: `An error occurred while saving. Please try again. ${(e as Error)?.message ?? ***REMOVED******REMOVED***}`,
        },
      ])
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="p-20">
        <p>You must be logged in to create an object type.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create object type</h1>
      {errorMessages.length > 0 && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <ul className="list-disc list-inside">
            {errorMessages.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}
      <FormCreator form={form} formValueState={[formValue, setFormValue]} />
      {formValue[***REMOVED***create_default_schema***REMOVED***] && (
        <>
          <h5 className="text-slate-800 font-bold">Default schema details</h5>
          <div className="flex flex-col gap-4 px-8 pb-8 bg-slate-100 border-2 shadow-md rounded">
            <FormCreator form={schemaForm} formValueState={[schemaFormValue, setSchemaFormValue]} />
          </div>
        </>
      )}
      <div className="flex flex-row gap-2 sticky bg-white/80 bottom-0 py-4">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
        </Button>
      </div>
    </div>
  )
}

const CreateObjectType = (): ReactElement => {
  const { data, isLoading, error } = useObjectTypeSchemaAndObjectCategories()
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && <CreateObjectTypeForm object_categories={data.object_categories} schema={data.schema} />}
    </ViewWithLoader>
  )
}

export default CreateObjectType
