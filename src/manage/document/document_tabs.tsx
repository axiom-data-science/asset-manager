import type { IDocument, IObjectType, IPredicate, IRelationship } from ***REMOVED***@/types/types***REMOVED***
import { Tabs, ViewWithLoader, type ITab } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import settingsStateAtom from ***REMOVED***@/state/settingsStateAtom***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***
import ExpectedChildTypeLoader, { ExpectedChildTypeSelector } from ***REMOVED***../components/expected_child_types_loader***REMOVED***
import { Link, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { fetchListFromPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***


type ISmallDoc = Pick<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***slug***REMOVED*** | ***REMOVED***label***REMOVED***>
type ISmallObjectType = Pick<IObjectType, ***REMOVED***uuid***REMOVED*** | ***REMOVED***slug***REMOVED*** | ***REMOVED***label***REMOVED*** | ***REMOVED***category***REMOVED***>

type IDocumentRelationship = {
  document: ISmallDoc
  object_type: ISmallObjectType
  relationship: IRelationship & {
    predicate: IPredicate
    label: string
    is_inverse: boolean
  }
  path: Array<ISmallDoc & { object_type: ISmallObjectType, relationship?: IRelationship & { predicate: IPredicate, label: string, is_inverse: boolean } }>
}

const RelatedDocuments = ({
  document,
  objectType }: {
    document: IDocument,
    objectType: IObjectType
  }) => {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: [***REMOVED***related-documents***REMOVED***, document.uuid],
    queryFn: async ({ signal }) => {
      const data = await fetchListFromPostgrest<IDocumentRelationship>({
        table: `rpc/get_related_documents?document_ref=${document.uuid}&direct_only=true`,
        token: user?.access_token,
        signal
      })

      const byPredicate: Record<string, IDocumentRelationship[]> = {}
      data.forEach(r => {
        const predicate = r.relationship.label
        if (!byPredicate[predicate]) {
          byPredicate[predicate] = []
        }
        byPredicate[predicate].push(r)
      })

      const documentLabelBySlug = Object.fromEntries(data.map(d => [d.document.slug, d.document.label]))
      if (!documentLabelBySlug[document.slug]) {
        documentLabelBySlug[document.slug] = document.label
      }

      const documentLabelByUUID = Object.fromEntries(data.map(d => [d.document.uuid, d.document.label]))
      if (!documentLabelByUUID[document.uuid]) {
        documentLabelByUUID[document.uuid] = document.label
      }


      return {
        list: data,
        byPredicate,
        documentLabelBySlug,
        documentLabelByUUID
      }
    }

  })
  return (
    <div className=***REMOVED***flex flex-col gap-8***REMOVED***>
      <div className=***REMOVED***text-bold text-2xl my-2***REMOVED***>Documents related to: {document.label}</div>
      <ViewWithLoader
        isLoading={isLoading}
        error={error}
        data={data}
      >
        {data && data.list.length > 0 ? (
          <>
            <>
              {
                Object.keys(data.byPredicate).map(predicate => (
                  <div key={predicate}>
                    <div className=***REMOVED***font-semibold text-slate-400 my-2 uppercase***REMOVED***>{predicate}</div>
                    <ul className=***REMOVED***flex flex-col gap-2***REMOVED***>
                      {data.byPredicate[predicate].map((r) => (
                        <li key={`$${r.document.uuid}.${r.relationship.predicate.label}`}>
                          <div><Link to={`/document/edit/${r.document.uuid}`} className=***REMOVED***text-blue-600 font-bold***REMOVED***>{r.document.label}</Link>{/* : {r.relationship.label}: {r.relationship.is_inverse ? ***REMOVED***Inverse***REMOVED*** : ***REMOVED***Direct***REMOVED***} */}</div>
                          {/* <div className=***REMOVED***text-xs text-gray-500 flex flex-row gap-2***REMOVED***>
                            {r.path.map(d => {
                              return <span key={d.uuid} className=***REMOVED***bg-slate-200 p-2***REMOVED***>{<Link to={`/document/edit/${d.uuid}?tab=related`} className=***REMOVED***text-blue-600***REMOVED***>{data.documentLabelBySlug[d.slug] ?? d.label}</Link>} {d.relationship ? <span>({d.relationship.label} [{d.relationship.is_inverse ? ***REMOVED***inverse***REMOVED*** : ***REMOVED***direct***REMOVED***}] <Link to={`/document/edit/${d.relationship.to_document_uuid}?tab=related`} className=***REMOVED***text-blue-600***REMOVED***>{data.documentLabelByUUID[d.relationship.to_document_uuid] ?? d.relationship.to_document_uuid}</Link>)</span> : ***REMOVED******REMOVED***}</span>
                            })}
                          </div> */}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              }
            </>
          </>
        ) : (
          <div>No related documents found.</div>
        )}
        <div>
          {
            objectType.data?.expected_child_types?.length ? (
              <ExpectedChildTypeLoader
                parentDocument={document}
                objectType={objectType}
              />
            ) : <></>
          }
        </div>

      </ViewWithLoader >
    </div>
  )
}

const DocumentTabs = ({
  objectType,
  View,
  viewLabel,
  ExpectedChildView,
  document,
}: {
  objectType: IObjectType
  View: ReactElement
  viewLabel: string
  ExpectedChildView?: ReactElement
  document?: IDocument
}) => {
  const [settingsState] = useAtom(settingsStateAtom)
  const [queryParams, setQueryParams] = useSearchParams()
  const shouldHaveTabs =
    settingsState.use_document_tabs /* &&
    (
      (
        objectType.data?.expected_child_types &&
        objectType.data.expected_child_types.length > 0
      ) ||
      document
    ) */

  const selectedTab = queryParams.get(***REMOVED***tab***REMOVED***) ?? ***REMOVED***parent***REMOVED***

  const tabs: ITab[] = [
    {
      id: ***REMOVED***parent***REMOVED***,
      label: viewLabel,
      content: View,
    },
    {
      id: ***REMOVED***related***REMOVED***,
      label: ***REMOVED***Related Documents***REMOVED***,
      disabled: !document,
      content: document && selectedTab === ***REMOVED***related***REMOVED***
        ? <RelatedDocuments document={document} objectType={objectType} /> : <></>,
    }
  ]

  objectType.data?.expected_child_types?.forEach((ect, index) => {
    const tab = `ec-${index}`
    tabs.push({
      id: tab,
      label: ect.label ?? ***REMOVED***Child Document***REMOVED***,
      disabled: !document,
      content: document && (
        <div className="flex flex-col gap-2 p-4 text-left">
          {selectedTab === tab && (
            <ExpectedChildTypeSelector
              parentDocument={document}
              objectType={objectType}
              createViewPath={`/create-document/${document.uuid}/${ect.predicate ?? ***REMOVED***has_parent***REMOVED***}/expected-predicate/:object_type_uuid/object_type?tab=${tab}`}
            />
          )}
          {ExpectedChildView && (
            <div className="flex flex-col gap-2p-4 text-left">{ExpectedChildView}</div>
          )}
        </div>
      ),
    })
  })

  return <>{shouldHaveTabs ? <Tabs
    tabs={tabs}
    selectedTab={selectedTab}
    onChange={(tabId) => {
      setQueryParams({ tab: tabId })
    }}

  /> : <>{View}</>}</>
}

export default DocumentTabs
