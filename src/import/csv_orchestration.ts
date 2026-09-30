import {
  formatUnmatchedArrayRowsError,
  mergeArraySourceRecordsIntoParentRecords,
} from './import_all_plan'
import type { CanonicalImportRecord, ImportArraySourceTarget, ImportCandidate } from './types'

export type CSVOrchestrationSource = {
  sourceId: string
  arrayTarget?: ImportArraySourceTarget
}

export type CSVLoadedSource = {
  source: CSVOrchestrationSource
  candidates: ImportCandidate[]
  records: CanonicalImportRecord[]
}

export const getCSVDocumentSources = <T extends CSVOrchestrationSource>(sources: T[]): T[] =>
  sources.filter((source) => !source.arrayTarget)

export const formatCSVRecordsError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  if (/array rows? did not match a parent record/i.test(message)) {
    return `Array composition blocked: ${message} Correct the parent and row lookup columns or add the missing parent rows, then continue again.`
  }
  return `Could not load CSV records: ${message}`
}

export const mergeCSVArraySources = ({
  parentSourceId,
  loadedSources,
}: {
  parentSourceId: string
  loadedSources: CSVLoadedSource[]
}): CanonicalImportRecord[] => {
  const parentLoaded = loadedSources.find(({ source }) => source.sourceId === parentSourceId)
  if (!parentLoaded) throw new Error('The parent CSV source could not be loaded.')

  let mergedRecords = parentLoaded.records
  for (const loaded of loadedSources) {
    const target = loaded.source.arrayTarget
    if (!target) continue
    const merged = mergeArraySourceRecordsIntoParentRecords({
      parentRecords: mergedRecords,
      arrayRecords: loaded.records,
      target,
    })
    if (merged.unmatchedArrayRecords.length > 0) {
      throw new Error(formatUnmatchedArrayRowsError(merged.unmatchedArrayRecords.length))
    }
    mergedRecords = merged.records
  }

  return mergedRecords
}
