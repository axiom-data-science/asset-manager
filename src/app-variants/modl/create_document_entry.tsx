import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import { utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { Book } from 'lucide-react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { CreateDocumentEntryProps } from '@/variants/types'

export type MODLCreateDocumentEntryProps = CreateDocumentEntryProps

export const MODLDocumentSelector = ({
  returnToOnSuccess = '/create-document-success',
  documentCreatePath,
}: MODLCreateDocumentEntryProps = {}): ReactElement => {
  const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
    object_type_params: {
      filters: [
        {
          column: 'slug',
          operator: 'eq',
          value: 'modl',
        },
      ],
    },
  })
  const createPath = documentCreatePath ?? '/create-document'
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      <div className="flex flex-row gap-3">
        {data?.object_types.flatMap((type) =>
          data.forms
            .filter((form) => form.object_type_uuid === type.uuid)
            .map((form) => (
              <Link
                key={form.uuid}
                to={{
                  pathname: `${createPath.replace(/\/$/, '')}/${type.uuid}/object_type/${form.uuid}/form`,
                  search: new URLSearchParams({
                    returnToOnSuccess,
                  }).toString(),
                }}
                className={utils.createButtonClass({ size: 'lg', variant: 'default' })}
              >
                Create another MODL metadata record
              </Link>
            ))
        )}
      </div>
    </ViewWithLoader>
  )
}

const MODLCreateDocumentEntry = (props: MODLCreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-2 flex flex-row items-center gap-2">
        <Book size={18} /> Create MODL metadata
      </h2>
      <MODLDocumentSelector {...(props ?? {})} />
    </>
  )
}

export default MODLCreateDocumentEntry
