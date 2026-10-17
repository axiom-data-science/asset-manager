import { MODLDocumentSelector } from '@/app-variants/modl/create_document_entry'
import MODLDocuments from '@/app-variants/modl/modl_documents'
import type { ReactElement } from 'react'
import type { CreateDocumentEntryProps } from '@/variants/types'

const MODLEntry = (props: CreateDocumentEntryProps = {}): ReactElement => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">MODL</h2>
      <div className="flex flex-row gap-6 h-full">
        <div className="flex flex-col gap-4 w-[40%]">
          <MODLDocumentSelector {...props} />
        </div>
        <div className="flex-1 min-w-0">
          <MODLDocuments
            Heading={<h2 className="font-semibold">MODL metadata records in progress</h2>}
          />
        </div>
      </div>
    </>
  )
}
export default MODLEntry
