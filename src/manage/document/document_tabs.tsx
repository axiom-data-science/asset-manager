import type { IDocument, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { Tabs, type ITab } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import settingsStateAtom from ***REMOVED***@/state/settingsStateAtom***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***
import { ExpectedChildTypeSelector } from ***REMOVED***../components/expected_child_types_loader***REMOVED***
import { useSearchParams } from ***REMOVED***react-router-dom***REMOVED***

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
      id: ***REMOVED***parent***REMOVED***,
      label: viewLabel,
      content: View,
    },
  ]
  const selectedTab = queryParams.get(***REMOVED***tab***REMOVED***) ?? ***REMOVED***parent***REMOVED***
  objectType.data?.expected_child_types?.forEach((ect, index) => {
    const tab = `ec-${index}`
    tabs.push({
      id: tab,
      label: ect.label ?? ***REMOVED***Child Document***REMOVED***,
      disabled: !document,
      content: document && (
        <div className="flex flex-col gap-2 p-4 text-left">
          <ExpectedChildTypeSelector
            parentDocument={document}
            objectType={objectType}
            createViewPath={`/create-document/${document.uuid}/${ect.predicate ?? ***REMOVED***has_parent***REMOVED***}/expected-predicate/:object_type_uuid/object_type?tab=${tab}`}
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
