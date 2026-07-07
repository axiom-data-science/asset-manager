import { Button, Loader, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { FormCreator, type IFormValues, type IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { patchObjectType } from ***REMOVED***@/manage/object_type/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import type { IAssetForm, IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***
import { objectTypeQueryKey, useObjectTypeFull } from ***REMOVED***@/manage/object_type/useObjectType***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { CopyFields } from ***REMOVED***../components/copy_field***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { BookPlus, Check, Network, Plus } from ***REMOVED***lucide-react***REMOVED***

const EditObjectTypeForm = ({
  object_type,
  forms,
  schemas,
}: {
  object_type: IObjectType
  forms: IAssetForm[]
  schemas: IObjectSchema[]
}): ReactElement => {
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [formValue, setFormValue] = useState<IFormValues>(object_type as unknown as IFormValues)
  const auth = useAuth()
  const navigate = useNavigate()

  const onUpdate = () => {
    setSaving(true)
    patchObjectType({
      uuid: object_type.uuid,
      object_type: formValue as unknown as IObjectType,
      token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
    }).then(() => {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: objectTypeQueryKey(object_type.uuid) })
      queryClient.invalidateQueries({ queryKey: [***REMOVED***object_type_list***REMOVED***] })
      navigate(***REMOVED***/object_type***REMOVED***)
    })
  }

  const form: IForm = {
    id: ***REMOVED***edit-object-type***REMOVED***,
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
        id: ***REMOVED***data***REMOVED***,
        label: ***REMOVED***Config***REMOVED***,
        type: ***REMOVED***json***REMOVED***,
      },
      {
        id: ***REMOVED***slug***REMOVED***,
        label: ***REMOVED***Slug***REMOVED***,
        type: ***REMOVED***constant***REMOVED***,
        defaultValue: object_type.slug,
      },
    ],
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="p-20">
        <p>You must be logged in to edit an object type.</p>
        <Button onClick={() => void auth.login()}>Log in</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Edit object type ({object_type.category})</h1>
      <CopyFields
        fields={[
          { id: ***REMOVED***category***REMOVED***, label: ***REMOVED***Category***REMOVED***, value: object_type.category },
          { id: ***REMOVED***slug***REMOVED***, label: ***REMOVED***Slug***REMOVED***, value: object_type.slug },
          { id: ***REMOVED***uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: object_type.uuid },
        ]}
      />
      <FormCreator form={form} formValueState={[formValue, setFormValue]} className="-mt-6" />
      <h4 className="font-bold text-slate-600 flex flex-row gap-2 items-center">
        <BookPlus size={14} /> Associated Forms{***REMOVED*** ***REMOVED***}
        {forms.length > 0 && (
          <Link
            to={`/forms/create?object_type=${object_type.uuid}`}
            className={utils.createButtonClass({
              size: ***REMOVED***xs***REMOVED***,
              type: ***REMOVED***create***REMOVED***,
              className: ***REMOVED***ml-2 gap-1***REMOVED***,
            })}
          >
            <Plus /> Create form for{***REMOVED*** ***REMOVED***}
            <strong className="underline underline-offset-2 decoration-dotted">
              {object_type.label}
            </strong>{***REMOVED*** ***REMOVED***}
            type
          </Link>
        )}
      </h4>
      <div className="p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md">
        {forms.length < 1 && (
          <div className="flex flex-col gap-4">
            <p>No forms found for this object type.</p>
            <div>
              <Link
                to={`/forms/create?object_type=${object_type.uuid}`}
                className={utils.createButtonClass({
                  size: ***REMOVED***md***REMOVED***,
                  variant: ***REMOVED***primary***REMOVED***,
                })}
              >
                Create form
              </Link>
            </div>
          </div>
        )}
        {forms.map((form) => {
          return (
            <div key={form.uuid} className="p-4 bg-white rounded-md flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {form.is_schema_and_version_default && (
                  <span className="text-xs text-slate-400">
                    <Check size={14} className="inline text-slate-600" /> Default form for{***REMOVED*** ***REMOVED***}
                    {object_type.label} v{form.object_schema_version}
                  </span>
                )}
                <Link to={`/forms/edit/${form.uuid}`}>
                  <h2 className="font-semibold">{form.label}</h2>
                </Link>
                <CopyFields
                  fields={[
                    { id: `slug-${form.uuid}`, label: ***REMOVED***Slug***REMOVED***, value: form.slug },
                    { id: `uuid-${form.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: form.uuid },
                  ]}
                />
              </div>
              <p className="text-sm text-gray-600">{form.description}</p>
            </div>
          )
        })}
      </div>
      <h4 className="font-bold text-slate-600 flex flex-row gap-2 items-center">
        <Network size={14} /> Associated Schemas
        {schemas.length > 0 && (
          <Link
            to={`/object_schema/create?object_type=${object_type.uuid}`}
            className={utils.createButtonClass({
              size: ***REMOVED***xs***REMOVED***,
              type: ***REMOVED***create***REMOVED***,
              className: ***REMOVED***ml-2 gap-1***REMOVED***,
            })}
          >
            <Plus /> Create schema for{***REMOVED*** ***REMOVED***}
            <strong className="underline underline-offset-2 decoration-dotted">
              {object_type.label}
            </strong>{***REMOVED*** ***REMOVED***}
            type
          </Link>
        )}
      </h4>
      <div className="p-8 bg-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-md">
        {schemas.length < 1 && (
          <div className="flex flex-col gap-4">
            <p>No schema found for this object type.</p>
            <div>
              <Link
                to={`/object_schema/create?object_type=${object_type.uuid}`}
                className={utils.createButtonClass({
                  size: ***REMOVED***md***REMOVED***,
                  variant: ***REMOVED***primary***REMOVED***,
                })}
              >
                Create schema
              </Link>
            </div>
          </div>
        )}
        {schemas.map((schema) => {
          return (
            <div key={schema.uuid} className="p-4 bg-white rounded-md flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {schema.is_type_default && (
                  <span className="text-xs text-slate-400">
                    <Check size={14} className="inline text-slate-600" /> Default schema for{***REMOVED*** ***REMOVED***}
                    {object_type.label}
                  </span>
                )}
                <h2 className="font-semibold">
                  {schema.label} (version: {schema.version})
                </h2>
                <CopyFields
                  stack={true}
                  fields={[
                    { id: `slug-${schema.uuid}`, label: ***REMOVED***Slug***REMOVED***, value: schema.slug },
                    { id: `uuid-${schema.uuid}`, label: ***REMOVED***UUID***REMOVED***, value: schema.uuid },
                  ]}
                />
              </div>
              <p className="text-sm text-gray-600">{schema.description}</p>
            </div>
          )
        })}
      </div>
      <div className="flex flex-row bg-white/80 py-4 sticky bottom-0">
        <Button onClick={onUpdate} type="primary" disabled={saving}>
          {saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}
        </Button>
      </div>
    </div>
  )
}

const EditObjectType = (): ReactElement => {
  const params = useParams()
  const uuid = params.uuid
  const { isLoading, error, data } = useObjectTypeFull({ uuid })

  //const { data: object_type, isLoading, error } = useObjectType(uuid ?? ***REMOVED******REMOVED***)
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <EditObjectTypeForm
          object_type={data.object_type}
          forms={data.forms}
          schemas={data.schemas}
        />
      )}
    </ViewWithLoader>
  )
}

export default EditObjectType
