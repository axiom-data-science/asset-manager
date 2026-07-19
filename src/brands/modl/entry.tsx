import { MODLDocumentSelector } from '@/brands/modl/create_document_entry'
import type { MODLCreateDocumentEntryProps } from '@/brands/modl/create_document_entry'
import type { ReactElement } from 'react'

const MODLEntry = (props: MODLCreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">MODL Entry Page</h2>
      <MODLDocumentSelector {...(props ?? {})} />
    </>
  )
}
export default MODLEntry
