import { atom } from 'jotai'
import type { ImportAllPlanSource } from '../import_all_plan'

export const uploadedImportSourcesAtom = atom<ImportAllPlanSource[]>([])
