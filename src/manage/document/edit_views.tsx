import type { IDocument, IObjectType } from '@/types/types'
import type { ComponentType, ReactNode } from 'react'
import DocumentFileEditView from '@/manage/document_file/edit_view'

export type IDocumentEditViewProps = {
  document: IDocument
  children: ReactNode
}

export type IDocumentEditViewConfig = {
  View: ComponentType<IDocumentEditViewProps>
  editableMetadata?: boolean
  excludedFormFieldIds?: string[]
}

const editViewsByObjectType: Partial<Record<string, IDocumentEditViewConfig>> = {}

const editViewsByCategory: Partial<Record<string, IDocumentEditViewConfig>> = {
  document_file: {
    View: DocumentFileEditView,
    editableMetadata: true,
    excludedFormFieldIds: [
      'label',
      'description',
      'external_file_refernce',
      'external_file_reference',
    ],
  },
}

export const resolveDocumentEditView = (
  objectType: IObjectType
): IDocumentEditViewConfig | undefined =>
  editViewsByObjectType[objectType.slug] ?? editViewsByCategory[objectType.category]
