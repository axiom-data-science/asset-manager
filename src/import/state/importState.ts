import type { IObjectType } from '@/types/types'
import type { IDocumentImport, IFullDocForImport } from '@/import/types'
import { atom } from "jotai"

const recordsToImportState = atom<Array<IDocumentImport & IFullDocForImport>>([])
const objectTypeForRecordsState = atom<IObjectType | undefined>(undefined)
const previewrecordsToImportState = atom<Array<IDocumentImport>>([])

export { recordsToImportState, objectTypeForRecordsState, previewrecordsToImportState }