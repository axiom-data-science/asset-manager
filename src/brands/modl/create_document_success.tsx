import ButtonLink from '@/manage/components/button_link'
import ExpectedChildTypeLoader from '@/manage/components/expected_child_types_loader'
import type { ICreateDocumentSuccessProps } from '@/manage/document/create_success'
import { useDocumentAndObjectTypeAndObjectTypeConfig } from '@/manage/document/useDocument'
import type { IDocument, IHydratedExpectedChildType, IObjectType } from '@/types/types'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'

const MODLCreateDocumentSuccess = ({
  action = 'created',
}: ICreateDocumentSuccessProps = {}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get('uuid')
  const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid ?? '')
  const created = action === 'created'

  if (!uuid) {
    return <div>Invalid document ID</div>
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data?.document && (
        <div className="flex flex-col p-10 gap-8 max-w-300 mx-auto bg-slate-100 shadow-md">
          <h1 className="font-medium text-2xl">
            Document {created ? 'Created' : 'Updated'} Successfully
          </h1>
          {
            data.objectType.slug.match(/modl_coll/i) ?
              <div className='flex flex-row'>
                <ButtonLink to={`/submit-document`}>
                  Submit metadata and collection metadata for data ingestion
                </ButtonLink>
              </div>
              :
              <ExpectedChildTypeLoader
                parentDocument={data.document}
                objectType={data.objectType}
              />
          }
          <div className="flex flex-row gap-4">
            <ButtonLink size="xs" variant="secondary" to={`/document`}>
              All documents
            </ButtonLink>

            <ButtonLink size="xs" variant="secondary" to={`/`}>
              Create another document
            </ButtonLink>
            <ButtonLink size="xs" variant="secondary" to={`/document/edit/${uuid}`}>
              Edit this document
            </ButtonLink>
          </div>
        </div>
      )}
    </ViewWithLoader>
  )
}
export default MODLCreateDocumentSuccess
