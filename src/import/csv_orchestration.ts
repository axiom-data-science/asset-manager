import {
  formatUnmatchedArrayRowsError,
  mergeArraySourceRecordsIntoParentRecords,
} from './import_all_plan'
import type { CanonicalImportRecord, ImportArraySourceTarget, ImportCandidate } from './types'
import type { ImportRelationshipRule, ImportSourceAdapter } from './types'

export type CSVOrchestrationSource = {
  sourceId: string
  typeSlug?: string
  role?: string
  arrayTarget?: ImportArraySourceTarget
  relationshipRule?: ImportRelationshipRule
  adapter?: Pick<ImportSourceAdapter, 'relationshipRules'>
}

export type CSVLoadedSource = {
  source: CSVOrchestrationSource
  candidates: ImportCandidate[]
  records: CanonicalImportRecord[]
}

export const getCSVDocumentSources = <T extends CSVOrchestrationSource>(sources: T[]): T[] =>
  sources.filter((source) => !source.arrayTarget)

export const getCSVSourceDependencies = <T extends CSVOrchestrationSource>(
  source: T,
  sources: T[]
): string[] => {
  if (source.arrayTarget || !source.typeSlug) return []

  const rules = sources.flatMap((candidate) =>
    candidate.relationshipRule
      ? [candidate.relationshipRule]
      : (candidate.adapter?.relationshipRules ?? [])
  )
  const dependencyIds = rules
    .filter((rule) => rule.childObjectTypeSlug === source.typeSlug)
    .flatMap((rule) => {
      const parents = getCSVDocumentSources(sources).filter(
        (candidate) =>
          candidate.sourceId !== source.sourceId &&
          candidate.typeSlug === rule.parentObjectTypeSlug
      )
      const explicitParents = parents.filter((candidate) => candidate.role === 'parent')
      return (explicitParents.length > 0 ? explicitParents : parents).map(
        (candidate) => candidate.sourceId
      )
    })

  return [...new Set(dependencyIds)]
}

export const getCSVDocumentSourcesInDependencyOrder = <T extends CSVOrchestrationSource>(
  sources: T[]
): T[] => {
  const documentSources = getCSVDocumentSources(sources)
  const pendingIds = new Set(documentSources.map((source) => source.sourceId))
  const ordered: T[] = []

  while (pendingIds.size > 0) {
    const next = documentSources.find(
      (source) =>
        pendingIds.has(source.sourceId) &&
        getCSVSourceDependencies(source, sources).every((dependencyId) => !pendingIds.has(dependencyId))
    )
    if (!next) break
    ordered.push(next)
    pendingIds.delete(next.sourceId)
  }

  return [...ordered, ...documentSources.filter((source) => pendingIds.has(source.sourceId))]
}

export const getCSVSourceExecutionDependencies = <T extends CSVOrchestrationSource>(
  source: T,
  sources: T[],
  orderedSources: T[]
): string[] => {
  const orderIndex = new Map(orderedSources.map((candidate, index) => [candidate.sourceId, index]))
  const sourceIndex = orderIndex.get(source.sourceId)
  if (sourceIndex === undefined) return []

  return getCSVSourceDependencies(source, sources).filter(
    (dependencyId) => (orderIndex.get(dependencyId) ?? Number.POSITIVE_INFINITY) < sourceIndex
  )
}

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
