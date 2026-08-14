import { Button, Loader, ViewWithLoader, Tabs, Checkbox } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FormCreator, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { postObjectType } from ***REMOVED***@/manage/object_type/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { useNavigate, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import type { IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { postObjectSchema } from ***REMOVED***@/manage/object_schema/services***REMOVED***
import { buildStringFromTemplate, validate } from ***REMOVED***@/lib/utils***REMOVED***
import { useSlug } from ***REMOVED***@/manage/components/useSlug***REMOVED***
import { useObjectTypeSchemaAndObjectCategories } from ***REMOVED***@/manage/object_type/useObjectType***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***
import { useObjectTypeDataForm } from ***REMOVED***@/manage/object_type/useObjectTypeDataForm***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***

const CreateObjectTypeForm = ({
  object_categories,
  objectTypeSchema,
  initialSchema,
  initialLabel,
  onSuccess,
  returnToOnSuccess

}: {
  object_categories: string[],
  objectTypeSchema: JSONSchema6,
  initialSchema?: JSONSchema6,
  initialLabel?: string,
  onSuccess?: (document: IObjectType) => void
  returnToOnSuccess?: string
}): ReactElement => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [errorMessages, setErrorMessages] = useState<{ field: string; message: string }[]>([])
  const auth = useAuth()

  const objectTypeFormWithoutSlug: IForm = {
    id: ***REMOVED***create-object-type***REMOVED***,
    settings: {
      show_progress: false,
    },

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
      }
    ]

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
  } = useSlug({
    form: objectTypeFormWithoutSlug,
    initialFormValues: {
      category:
        object_categories.find((c) => c === searchParams.get(***REMOVED***category***REMOVED***)) ??
        object_categories.find((d) => d.toLowerCase() === ***REMOVED***document***REMOVED***) ??
        object_categories[0],
      label: initialLabel ?? undefined,
    }
  })

  const {
    form: schemaForm,
    formState: [schemaFormValue, setSchemaFormValue],
    filterForSave: schemaFilterForSave,
  } = useSlug({
    form: schemaFormWithoutSlug,
    initialFormValues: initialSchema ? {
      json_schema: initialSchema as JSON,
      label: initialLabel ?? undefined,
    } : {},
  })


  const {
    form: objectTypeConfigForm,
    formState: [objectTypeConfigFormValue, setObjectTypeConfigFormValue],
    filterForSave: objectTypeConfigFilterForSave
  } = useObjectTypeDataForm({
    objectTypeSchema
  })

  const [createDefaultSchema, setCreateDefaultSchema] = useState(initialSchema ? true : false)



  const onSave = async () => {
    setSaving(true)
    try {
      const typeValid = await validate({ form, formValues: formValue })
      const schemaValid = createDefaultSchema
        ? await validate({
          form: schemaForm,
          formValues: schemaFormValue,
          schemaFields: [***REMOVED***json_schema***REMOVED***],
        })
        : { valid: true, errors: [] }
      const valid = {
        valid: typeValid.valid && schemaValid.valid,
        errors: [...typeValid.errors, ...(schemaValid.errors?.map(e => {
          return {
            ...e,
            fieldLabel: `${e.fieldLabel ? `${e.fieldLabel}` : ***REMOVED******REMOVED***} [default schema]`
          }
        }))],
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
      const valuesToSave = {
        ...filterForSave(formValue),
        data: objectTypeConfigFilterForSave(objectTypeConfigFormValue) as JSONSchema6 | undefined,
      }

      const newObjectType = await postObjectType({
        object_type: valuesToSave as Omit<IObjectType, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })

      if (createDefaultSchema) {
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

      if (onSuccess) {
        onSuccess(newObjectType)
      }

      const navPath =
        returnToOnSuccess !== undefined
          ? buildStringFromTemplate(returnToOnSuccess, { ...newObjectType })
          : (new URLSearchParams(window.location.search).get(***REMOVED***returnToOnSuccess***REMOVED***) ?? undefined)

      setSaving(false)
      navigate(`${navPath ?? ***REMOVED***/object_type***REMOVED***}?uuid=${newObjectType.uuid}`)
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
      <Errors errors={errorMessages} />
      <Tabs
        tabs={[
          {
            id: "object-type-details",
            label: ***REMOVED***Object type details***REMOVED***,
            content: (
              <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            )
          },
          {
            id: ***REMOVED***object-type-config***REMOVED***,
            label: ***REMOVED***Object type config***REMOVED***,
            content: (
              <FormCreator form={objectTypeConfigForm} formValueState={[objectTypeConfigFormValue, setObjectTypeConfigFormValue]} />
            )
          },
          {
            id: "object-type-default-schema",
            label: ***REMOVED***Default schema***REMOVED***,
            content: (
              <>
                <Checkbox
                  id="create_default_schema"
                  testId=***REMOVED***create_default_schema***REMOVED***
                  label="Create default schema"
                  value={createDefaultSchema}
                  onChange={(checked) => {
                    setCreateDefaultSchema(checked)
                    setFormValue((prev) => ({ ...prev, create_default_schema: checked }))
                  }}
                />
                {createDefaultSchema && (
                  <FormCreator form={schemaForm} formValueState={[schemaFormValue, setSchemaFormValue]} />
                )}
              </>
            )
          }
        ]}
      />
      <div className="flex flex-row gap-2 sticky bg-white/80 bottom-0 py-4 justify-end">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
        </Button>
      </div>
    </div>
  )
}

const CreateObjectType = ({
  initialSchema,
  initialLabel,
  onSuccess,
  returnToOnSuccess,
}: {
  initialSchema?: JSONSchema6,
  initialLabel?: string
  onSuccess?: (newObjectType: IObjectType) => void
  returnToOnSuccess?: string
}): ReactElement => {
  const { data, isLoading, error } = useObjectTypeSchemaAndObjectCategories()
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && <CreateObjectTypeForm
        object_categories={data.object_categories}
        objectTypeSchema={data.schema}
        initialSchema={initialSchema}
        initialLabel={initialLabel}
        onSuccess={onSuccess}
        returnToOnSuccess={returnToOnSuccess}
      />}
    </ViewWithLoader>
  )
}

export default CreateObjectType
