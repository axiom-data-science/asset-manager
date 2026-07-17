import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchObjectSchema } from ***REMOVED***@/manage/object_schema/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import type { IAssetForm, IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***../components/errors***REMOVED***
import { useObjectSchemaFull } from ***REMOVED***@/manage/object_schema/useObjectSchema***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***
import { CopyButton, CopyFields } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import { BookPlus, Check, X } from ***REMOVED***lucide-react***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***

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
      ***REMOVED***is_type_default***REMOVED***,
      ***REMOVED***json_config***REMOVED***,
      ***REMOVED***owner_sub***REMOVED***,
      ***REMOVED***uuid***REMOVED***,
      ***REMOVED***created_at***REMOVED***,
      ***REMOVED***updated_at***REMOVED***
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
        behavior: ***REMOVED***smooth***REMOVED***,
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
            ***REMOVED***owner_sub***REMOVED*** | ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***
          >),
        },
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })
      setSaving(false)
      navigate(***REMOVED***/object_schema***REMOVED***)
    } catch (e) {
      setSaving(false)
      setErrorMessages([
        {
          field: ***REMOVED***form***REMOVED***,
          message: `An error occurred while creating the object schema. Please try again.${(e as Error).message ? ` Error: ${(e as Error).message}` : ***REMOVED******REMOVED***}`,
        },
      ])
      window.scrollTo({
        top: 0,
        behavior: ***REMOVED***smooth***REMOVED***,
      })
    }
  }

  const form: IForm = {
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
        label: ***REMOVED***JSON schema***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
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
          { id: ***REMOVED***slug***REMOVED***, label: ***REMOVED***Slug***REMOVED***, value: object_schema.slug },
          { id: ***REMOVED***uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: object_schema.uuid },
          { id: ***REMOVED***object_type_uuid***REMOVED***, label: ***REMOVED***Object type***REMOVED***, value: object_schema.object_type_uuid },
          { id: ***REMOVED***object_type_slug***REMOVED***, label: ***REMOVED***Object type slug***REMOVED***, value: objectType.slug }
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
            <span>{object_schema.is_type_default ? ***REMOVED***Yes***REMOVED*** : ***REMOVED***No***REMOVED***}</span>
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
                fields={[{ id: `uuid-${objectType.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: objectType.uuid }]}
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
                      { id: `uuid-${assetForm.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: assetForm.uuid },
                      { id: `slug-${assetForm.uuid}`, label: ***REMOVED***Slug***REMOVED***, value: assetForm.slug },
                      {
                        id: `version-${assetForm.uuid}`,
                        label: ***REMOVED***Schema version***REMOVED***,
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
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}
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
