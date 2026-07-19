import { useObjectTypesAndFormsAndSchemas } from ***REMOVED***@/manage/object_type/useObjectTypeList***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { Book } from ***REMOVED***lucide-react***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***
import { Link } from ***REMOVED***react-router-dom***REMOVED***

export type MODLCreateDocumentEntryProps = {
  returnToOnSuccess?: string
  documentCreatePath?: string
}

export const MODLDocumentSelector = ({
  returnToOnSuccess,
  documentCreatePath,
}: MODLCreateDocumentEntryProps = {}): ReactElement => {
  const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
    object_type_params: {
      filters: [
        {
          column: ***REMOVED***slug***REMOVED***,
          operator: ***REMOVED***eq***REMOVED***,
          value: ***REMOVED***modl***REMOVED***,
        },
      ],
    },
  })

  documentCreatePath = documentCreatePath ?? ***REMOVED***/document/create***REMOVED***

  return (
    <>
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data &&
          data.object_types.map((type) => {
            const forms = data.forms.filter((f) => f.object_type_uuid === type.uuid)
            return (
              <div className="flex flex-row gap-4" key={type.uuid}>
                {forms.map((form) => {
                  return (
                    <div key={form.uuid} className="flex flex-col gap-2">
                      <Link
                        to={`${documentCreatePath.replace(/\/$/, ***REMOVED******REMOVED***)}/${type.uuid}/object_type/${form.uuid}/form${returnToOnSuccess ? `?returnToOnSuccess=${returnToOnSuccess}` : ***REMOVED******REMOVED***}`}
                        className="bg-[#003087] text-white px-4 py-2 rounded-md hover:bg-[#0056b3] transition-colors duration-300"
                      >
                        Create {form.label}
                      </Link>
                    </div>
                  )
                })}
              </div>
            )
          })}
      </ViewWithLoader>
    </>
  )
}

const MODLCreateDocumentEntry = (props: MODLCreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex flex-row items-center gap-2">
        <Book size={18} /> Create asset metadata
      </h2>
      <MODLDocumentSelector {...(props ?? {})} />
    </>
  )
}

export default MODLCreateDocumentEntry
