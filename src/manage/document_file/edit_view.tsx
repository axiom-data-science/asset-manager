import type { IDocument } from '@/types/types'
import type { ReactElement, ReactNode } from 'react'
import DocumentFilePreview from './preview'

const DocumentFileEditView = ({
  document,
  children,
}: {
  document: IDocument
  children: ReactNode
}): ReactElement => (
  <div className="grid items-start gap-6 xl:grid-cols-2">
    <DocumentFilePreview documentUuid={document.uuid} />
    <div className="min-w-0">{children}</div>
  </div>
)

export default DocumentFileEditView
