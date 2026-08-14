import type { IObjectType } from ***REMOVED***@/types/types***REMOVED***
import type { IDocumentImport, IFullDocForImport } from ***REMOVED***@/import/types***REMOVED***
import { atom } from "jotai"

const recordsToImportState = atom<Array<IDocumentImport & IFullDocForImport>>([])
const objectTypeForRecordsState = atom<IObjectType | undefined>(undefined)

export { recordsToImportState, objectTypeForRecordsState }