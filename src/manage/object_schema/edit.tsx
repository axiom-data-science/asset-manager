import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { patchObjectSchema } from '@/manage/object_schema/services'
import { useAuth } from '@/auth/useAuth'
import type { IAssetForm, IObjectSchema, IObjectType } from '@/types/types'
import { useNavigate, useParams } from 'react-router-dom'
import { validate } from '@/lib/utils'
import Errors from '../components/errors'
import { useObjectSchemaFull } from '@/manage/object_schema/useObjectSchema'
import { omit } from 'lodash-es'
import { CopyButton, CopyFields } from '@/manage/components/copy_field'
import { BookPlus, Check, X } from 'lucide-react'
import Link from '@/manage/components/link'

const CreateObjectSchemaForm = ({
  object_schema,
  object_types,
  assetForms,
}: {
  object_schema: IObjectSchema
  object_types: IObjectType[]
  assetForms: IAssetForm[]
}): ReactElement => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const auth = useAuth()
  const [errorMessages, setErrorMessages] = useState<{ field: string; message: string }[]>([])
  const [formValues, setFormValues] = useState<IFormValues>(
    omit(
      object_schema,
      'is_type_default',
      'json_config',
      'owner_sub',
      'uuid',
      'created_at',
      'updated_at'
    ) as IFormValues
  )
  const objectTypeMap = Object.fromEntries(object_types.map((ot) => [ot.uuid, ot]))
  const objectType = objectTypeMap[object_schema.object_type_uuid]

  const onUpdate = async () => {
    const valid = await validate({ form, formValues })
    if (!valid.valid && valid.errors.length > 0) {
      setErrorMessages(valid.errors)
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }
    setSaving(true)
    try {
      await patchObjectSchema({
        uuid: object_schema.uuid,
        object_schema: {
          ...(formValues as Omit<
            IObjectSchema,
            'owner_sub' | 'uuid' | 'created_at' | 'updated_at'
          >),
        },
        token: auth.user?.access_token ?? '',
      })
      setSaving(false)
      navigate('/object_schema')
    } catch (e) {
      setSaving(false)
      setErrorMessages([
        {
          field: 'form',
          message: `An error occurred while creating the object schema. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ''}`,
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }

  const form: IForm = {
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
        label: 'JSON schema',
        type: 'json',
      },
    ],
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="p-20">
        <p>You must be logged in to edit an object schema.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Edit schema details</h1>
      <Errors errors={errorMessages} />
      <CopyFields
        fields={[
          { id: 'slug', label: 'Slug', value: object_schema.slug },
          { id: 'uuid', label: 'UUID', value: object_schema.uuid },
          { id: 'object_type_uuid', label: 'Object type', value: object_schema.object_type_uuid },
          { id: 'object_type_slug', label: 'Object type slug', value: objectType.slug }
        ]}
      />
      <FormCreator form={form} formValueState={[formValues, setFormValues]} />
      <div className="p-4 bg-slate-100 flex flex-col gap-8 rounded">
        <div>
          <h4>Schema version</h4>
          <div className="p-4 bg-slate-200 rounded-md">
            <p className="font-semibold">{object_schema.version}</p>
          </div>
        </div>
        <div>
          <h4>Is default schema for object type?</h4>
          <div className="p-4 bg-slate-200 rounded-md flex items-center gap-2">
            {object_schema.is_type_default ? (
              <Check size={22} color="green" />
            ) : (
              <X size={22} color="red" />
            )}
            <span>{object_schema.is_type_default ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div className="hidden">
          <p className="mb-2">JSON config</p>
          <pre className="max-h-125 overflow-scroll bg-slate-200 p-4 rounded-md text-xs relative whitespace-pre-wrap">
            <span className="cursor-pointer absolute right-4 top-4 text-slate-400">
              <CopyButton value={JSON.stringify(object_schema.json_schema, null, 2)} size={48} />
            </span>

            {JSON.stringify(object_schema.json_schema, null, 2)}
          </pre>
        </div>
        <div>
          <h4>Associated Type</h4>
          <div className="p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md">
            <div className="mb-4 bg-white p-4 rounded-md">
              <p className="font-semibold">
                <Link to={`/object_type/edit/${objectType.uuid}`}>
                  {objectType.label} ({objectType.category})
                </Link>
              </p>
              <CopyFields
                stack={true}
                fields={[{ id: `uuid-${objectType.uuid}`, label: 'UUID', value: objectType.uuid }]}
              />
            </div>
          </div>
        </div>
        <div>
          <h4 className="flex flex-row gap-2 items-center">
            <BookPlus size={18} />
            Associated Forms
          </h4>
          <div className="p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md">
            {assetForms.map((assetForm) => {
              return (
                <div key={assetForm.uuid} className="mb-4 bg-white p-4 rounded-md">
                  <p className="font-semibold">
                    <Link to={`/forms/edit/${assetForm.uuid}`}>{assetForm.label}</Link>
                  </p>
                  <CopyFields
                    stack={true}
                    fields={[
                      { id: `uuid-${assetForm.uuid}`, label: 'UUID', value: assetForm.uuid },
                      { id: `slug-${assetForm.uuid}`, label: 'Slug', value: assetForm.slug },
                      {
                        id: `version-${assetForm.uuid}`,
                        label: 'Schema version',
                        value: assetForm.object_schema_version,
                      },
                    ]}
                  />
                </div>
              )
            }) ?? <p>No forms associated with this schema.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
        <Button onClick={onUpdate} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  )
}

const EditObjectSchema = (): ReactElement => {
  const params = useParams()
  const { data, isLoading, error } = useObjectSchemaFull({ uuid: params.uuid })
  if (params.uuid === null || params.uuid === undefined) {
    return (
      <div className="p-20">
        <p>Invalid object schema UUID.</p>
      </div>
    )
  }
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <CreateObjectSchemaForm
          object_schema={data.object_schema}
          object_types={data.object_types}
          assetForms={data.forms}
        />
      )}
    </ViewWithLoader>
  )
}

export default EditObjectSchema
