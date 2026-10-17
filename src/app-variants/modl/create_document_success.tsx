import ExpectedChildTypeLoader from '@/manage/components/expected_child_types_loader'
import ButtonLink from '@/manage/components/button_link'
import type { ICreateDocumentSuccessProps } from '@/manage/document/create_success'
import { useDocumentAndObjectTypeAndObjectTypeConfig } from '@/manage/document/useDocument'
import { Button, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Share } from 'lucide-react'
import ShareDocument from '@/components/custom/share-document'
import Link from '@/manage/components/link'
import MODLDocuments from './modl_documents'
import { MODLDocumentSelector } from './create_document_entry'
import { MODLSuccessChildTypeActions } from './modl_child_type_actions'

const MODLCreateDocumentSuccess = ({
  action = 'created',
}: ICreateDocumentSuccessProps = {}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get('uuid')
  const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid ?? '')
  const updated = action === 'updated' || searchParams.get('action') === 'edit'

  if (!uuid) {
    return <div>Invalid document ID</div>
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data?.document && (
        <div className="flex flex-col gap-10 p-10">
          <h1 className="text-2xl font-medium">
            MODL document {updated ? 'updated' : 'created'}
          </h1>
          <div className="flex flex-row gap-10">
            <div className="flex w-[40%] flex-col gap-8">
              <div className="flex flex-wrap items-center gap-3">
                <Check className="text-green-500" size={24} />
                <Link to={`/documents/${uuid}`} className="font-bold">
                  {data.document.label}
                </Link>
                {updated ? 'updated' : 'created'}
                <ShareDocument
                  document={data.document}
                  SelectButton={
                    <Button size="xs" variant="outline">
                      Share <Share />
                    </Button>
                  }
                />
              </div>
              {data.objectType.slug.match(/modl_coll/i) && (
                <ButtonLink to="/submit-document">
                  Submit metadata and collection metadata for data ingestion
                </ButtonLink>
              )}
              <ExpectedChildTypeLoader
                parentDocument={data.document}
                objectType={data.objectType}
                View={MODLSuccessChildTypeActions}
              />
              <MODLDocumentSelector />
            </div>
            <div className="flex-1 min-w-0">
              <MODLDocuments
                Heading={<h2 className="font-semibold">MODL metadata records in progress</h2>}
                excludeDocumentUUID={updated ? undefined : uuid}
              />
            </div>
          </div>
        </div>
      )}
    </ViewWithLoader>
  )
}
export default MODLCreateDocumentSuccess
