import ButtonLink from ***REMOVED***@/manage/components/button_link***REMOVED***
import ExpectedChildTypeLoader from ***REMOVED***@/manage/components/expected_child_types_loader***REMOVED***
import type { ICreateDocumentSuccessProps } from ***REMOVED***@/manage/document/create_success***REMOVED***
import { useDocumentAndObjectTypeAndObjectTypeConfig } from ***REMOVED***@/manage/document/useDocument***REMOVED***
import type { IDocument, IHydratedExpectedChildType, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***
import { useSearchParams } from ***REMOVED***react-router-dom***REMOVED***

const MODLCreateDocumentSuccess = ({
  action = ***REMOVED***created***REMOVED***,
}: ICreateDocumentSuccessProps = {}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get(***REMOVED***uuid***REMOVED***)
  const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid ?? ***REMOVED******REMOVED***)
  const created = action === ***REMOVED***created***REMOVED***

  if (!uuid) {
    return <div>Invalid document ID</div>
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data?.document && (
        <div className="flex flex-col p-10 gap-8 max-w-300 mx-auto bg-slate-100 shadow-md">
          <h1 className="font-medium text-2xl">
            Document {created ? ***REMOVED***Created***REMOVED*** : ***REMOVED***Updated***REMOVED***} Successfully
          </h1>
          {
            data.objectType.slug.match(/modl_coll/i) ?
              <div className=***REMOVED***flex flex-row***REMOVED***>
                <ButtonLink to={`/submit-document`}>
                  Submit metadata and collection metadata for data ingestion
                </ButtonLink>
              </div>
              :
              <ExpectedChildTypeLoader
                parentDocument={data.document}
                objectType={data.objectType}
                View={({
                  parentDocument,
                  expectedChildTypes,
                }: {
                  parentDocument?: IDocument<unknown>
                  objectType: IObjectType
                  expectedChildTypes?: IHydratedExpectedChildType[]
                }): ReactElement => {
                  return (
                    <div>
                      {expectedChildTypes?.map((ect, index) => {
                        return (
                          <div key={index} className="flex flex-col gap-2 bg-slate-100 text-left">
                            <h4 className="font-medium">{ect.label}</h4>
                            {
                              ect?.description && <p className=***REMOVED***text-sm text-gray-700***REMOVED***>{ect.description}</p>
                            }
                            <div className="flex flex-row gap-4">
                              {ect?.object_types?.map((ot) => {
                                return (
                                  <ButtonLink
                                    to={`/create-document/${ot.uuid}/object_type?parentDocumentUUID=${parentDocument?.uuid}&hasPredicate=${ect.has_predicate}&parentObjectTypeUUID=${parentDocument?.object_type_uuid}&returnToOnSuccess=/create-document-success`}
                                    key={ot.uuid}
                                  >
                                    Create {ot.label}
                                  </ButtonLink>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }}
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
