import { Button, Loader, ViewWithLoader, Tabs, Checkbox } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { FormCreator, type IForm } from '@axdspub/axiom-ui-forms'
import { postObjectType } from '@/manage/object_type/services'
import { useAuth } from '@/auth/useAuth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { IObjectSchema, IObjectType } from '@/types/types'
import { postObjectSchema } from '@/manage/object_schema/services'
import { validate } from '@/lib/utils'
import { useSlug } from '@/manage/components/useSlug'
import { useObjectTypeSchemaAndObjectCategories } from '@/manage/object_type/useObjectType'
import type { JSONSchema6 } from 'json-schema'
import { useObjectTypeDataForm } from '@/manage/object_type/useObjectTypeDataForm'

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

  const objectTypeFormWithoutSlug: IForm = {
    id: 'create-object-type',
    settings: {
      show_progress: false,
    },

    fields: [
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        options: object_categories.map((c) => {
          return { label: c, value: c }
        }),
        required: true,
        settings: {},
      },
      {
        id: 'label',
        label: 'Label',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'long_text',
      }
    ]

  }

  const schemaFormWithoutSlug: IForm = {
    id: 'create-object-type',
    settings: {
      show_progress: false,
    },
    fields: [
      {
        id: 'label',
        label: 'Label',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'long_text',
      },
      {
        id: 'json_schema',
        label: 'Schema (JSON)',
        type: 'json',
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
        object_categories.find((c) => c === searchParams.get('category')) ??
        object_categories.find((d) => d.toLowerCase() === 'document') ??
        object_categories[0]
    }
  })

  const {
    form: schemaForm,
    formState: [schemaFormValue, setSchemaFormValue],
    filterForSave: schemaFilterForSave,
  } = useSlug({
    form: schemaFormWithoutSlug
  })


  const {
    form: objectTypeConfigForm,
    formState: [objectTypeConfigFormValue, setObjectTypeConfigFormValue],
    filterForSave: objectTypeConfigFilterForSave
  } = useObjectTypeDataForm({
    objectTypeSchema: schema
  })

  const [createDefaultSchema, setCreateDefaultSchema] = useState(false)



  const onSave = async () => {
    setSaving(true)
    try {
      const typeValid = await validate({ form, formValues: formValue })
      const schemaValid = createDefaultSchema
        ? await validate({
          form: schemaForm,
          formValues: schemaFormValue,
          messagePrefix: 'Default schema',
          schemaFields: ['json_schema'],
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
          behavior: 'smooth', // Adds a gradual animation
        })
        return
      }
      setErrorMessages([])
      const valuesToSave = {
        ...filterForSave(formValue),
        data: objectTypeConfigFilterForSave(objectTypeConfigFormValue) as JSONSchema6 | undefined,
      }

      const newObjectType = await postObjectType({
        object_type: valuesToSave as Omit<IObjectType, 'uuid' | 'created_at' | 'updated_at'>,
        token: auth.user?.access_token ?? '',
      })

      if (createDefaultSchema) {
        const schemaValuesToSave = schemaFilterForSave(schemaFormValue)
        schemaValuesToSave['object_type_uuid'] = newObjectType.uuid
        schemaValuesToSave['is_type_default'] = true
        await postObjectSchema({
          object_schema: schemaValuesToSave as Omit<
            IObjectSchema,
            'uuid' | 'created_at' | 'updated_at'
          >,
          token: auth.user?.access_token ?? '',
        })
      }
      setSaving(false)
      navigate('/object_type')
    } catch (e: unknown) {
      setSaving(false)
      setErrorMessages([
        {
          field: 'form',
          message: `An error occurred while saving. Please try again. ${(e as Error)?.message ?? ''}`,
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
      <Tabs
        tabs={[
          {
            id: "object-type-details",
            label: 'Object type details',
            content: (
              <FormCreator form={form} formValueState={[formValue, setFormValue]} />
            )
          },
          {
            id: 'object-type-config',
            label: 'Object type config',
            content: (
              <FormCreator form={objectTypeConfigForm} formValueState={[objectTypeConfigFormValue, setObjectTypeConfigFormValue]} />
            )
          },
          {
            id: "object-type-default-schema",
            label: 'Default schema',
            content: (
              <>
                <Checkbox
                  id="create_default_schema"
                  testId='create_default_schema'
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
      <div className="flex flex-row gap-2 sticky bg-white/80 bottom-0 py-4">
        <Button onClick={onSave} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Save'}
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
