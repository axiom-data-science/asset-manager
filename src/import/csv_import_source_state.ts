export type CSVImportSourceState = {
    sourceId: string
}

export const updateCSVImportSource = <T extends CSVImportSourceState>(
    sources: T[],
    sourceId: string,
    update: Partial<T>
): T[] => sources.map((source) =>
    source.sourceId === sourceId ? { ...source, ...update } : source
)