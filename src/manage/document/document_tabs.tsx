import type { IDocument, IObjectType } from '@/types/types'
import { Tabs, type ITab } from '@axdspub/axiom-ui-utilities'
import { useAtom } from 'jotai'
import settingsStateAtom from '@/state/settingsStateAtom'
import type { ReactElement } from 'react'
import { ExpectedChildTypeSelector } from '../components/expected_child_types_loader'
import { useSearchParams } from 'react-router-dom'

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
  const [queryParams] = useSearchParams()
  const shouldHaveTabs =
    settingsState.use_document_tabs &&
    objectType.data?.expected_child_types &&
    objectType.data.expected_child_types.length > 0

  const tabs: ITab[] = [
    {
      id: 'parent',
      label: viewLabel,
      content: View,
    },
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

  return <>{shouldHaveTabs ? <Tabs tabs={tabs} selectedTab={selectedTab} /> : <>{View}</>}</>
}

export default DocumentTabs
