import { MODLDocumentSelector } from ***REMOVED***@/brands/modl/create_document_entry***REMOVED***
import type { MODLCreateDocumentEntryProps } from ***REMOVED***@/brands/modl/create_document_entry***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***

const MODLEntry = (props: MODLCreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">MODL Entry Page</h2>
      <MODLDocumentSelector {...(props ?? {})} />
    </>
  )
}
export default MODLEntry
