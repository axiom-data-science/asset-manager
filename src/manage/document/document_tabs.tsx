import type { IDocument, IObjectType, IPredicate, IRelationship } from '@/types/types'
import { Tabs, ViewWithLoader, type ITab } from '@axdspub/axiom-ui-utilities'
import { useAtom } from 'jotai'
import settingsStateAtom from '@/state/settingsStateAtom'
import type { ReactElement } from 'react'
import ExpectedChildTypeLoader, { ExpectedChildTypeSelector } from '../components/expected_child_types_loader'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchListFromPostgrest } from '@/services/postgrest/services'
import { useAuth } from '@/auth/useAuth'


type ISmallDoc = Pick<IDocument, 'uuid' | 'slug' | 'label'>
type ISmallObjectType = Pick<IObjectType, 'uuid' | 'slug' | 'label' | 'category'>

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
    queryKey: ['related-documents', document.uuid],
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
    <div className='flex flex-col gap-8'>
      <div className='text-bold text-2xl my-2'>Documents related to: {document.label}</div>
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
                    <div className='text-bold text-lg my-2'>{predicate}</div>
                    <ul className='flex flex-col gap-2'>
                      {data.byPredicate[predicate].map((r) => (
                        <li key={`$${r.document.uuid}.${r.relationship.predicate.label}`}>
                          <div><Link to={`/document/edit/${r.document.uuid}`} className='text-blue-600 font-bold'>{r.document.label}</Link>: {r.relationship.label}: {r.relationship.is_inverse ? 'Inverse' : 'Direct'}</div>
                          <div className='text-xs text-gray-500 flex flex-row gap-2'>
                            {r.path.map(d => {
                              return <span key={d.uuid} className='bg-slate-200 p-2'>{<Link to={`/document/edit/${d.uuid}?tab=related`} className='text-blue-600'>{data.documentLabelBySlug[d.slug] ?? d.label}</Link>} {d.relationship ? <span>({d.relationship.label} [{d.relationship.is_inverse ? 'inverse' : 'direct'}] <Link to={`/document/edit/${d.relationship.to_document_uuid}?tab=related`} className='text-blue-600'>{data.documentLabelByUUID[d.relationship.to_document_uuid] ?? d.relationship.to_document_uuid}</Link>)</span> : ''}</span>
                            })}
                          </div>
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


  const tabs: ITab[] = [
    {
      id: 'parent',
      label: viewLabel,
      content: View,
    },
    {
      id: 'related',
      label: 'Related Documents',
      disabled: !document,
      content: document
        ? <RelatedDocuments document={document} objectType={objectType} /> : <></>,
    }
  ]

  const selectedTab = queryParams.get('tab') ?? 'parent'
  objectType.data?.expected_child_types?.forEach((ect, index) => {
    const tab = `ec-${index}`
    tabs.push({
      id: tab,
      label: ect.label ?? 'Child Document',
      disabled: !document,
      content: document && (
        <div className="flex flex-col gap-2 p-4 text-left">
          <ExpectedChildTypeSelector
            parentDocument={document}
            objectType={objectType}
            createViewPath={`/create-document/${document.uuid}/${ect.predicate ?? 'has_parent'}/expected-predicate/:object_type_uuid/object_type?tab=${tab}`}
          />
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
