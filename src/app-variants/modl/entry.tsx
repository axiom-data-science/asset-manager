import { MODLDocumentSelector } from '@/app-variants/modl/create_document_entry'
import type { ReactElement } from 'react'
import type { CreateDocumentEntryProps } from '@/variants/types'

const MODLEntry = (props: CreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">MODL Entry Page</h2>
      <MODLDocumentSelector {...(props ?? {})} />
    </>
  )
}
export default MODLEntry
