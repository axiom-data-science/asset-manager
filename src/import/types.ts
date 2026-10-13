import type { IDocument } from "@/types/types"
import type { JSONSchema6 } from 'json-schema'

export type IDocumentImport<T = unknown> = {
    data: T
    uuid: string
    label: string
    slug: string
    description?: string
    selected?: boolean
    imported?: boolean
    loading?: boolean
    partial?: boolean
}

type ISearchRecordRoot = {
    uuid: string
    label: string
    id: string
    type: string
}


export type ISearchRecord<T = unknown> = ISearchRecordRoot & {
    source: T & ISearchRecordRoot & Record<string, unknown>
    data: ISearchRecordRoot & Record<string, unknown>
}



export type IBinninatorColumnStorageType =
    | 'String'
    | 'Float64'
    | 'Bool'
    | 'DateTime64'
    | 'UInt64'
    | (string & {}) // allows future/unseen backend types

export interface IBinninatorFieldStats {
    type: IBinninatorColumnStorageType
    non_null_count: number
    mean: number | null
    min: number | string | null
    max: number | string | null
    stddev: number | null
    p10: number | null
    p25: number | null
    p75: number | null
    p90: number | null
    median: number | null
    is_numeric: boolean
}

export interface IBinninatorDatasetMetadata {
    uuid: string
    is_spatial: boolean
    available_resolutions: number[]
    columns: Record<string, IBinninatorFieldStats>
    dimensions: Record<string, IBinninatorFieldStats>
    column_conversions: Record<string, string>
    available_time_bins: '*' | string | string[]
}

export interface IBinninatorMetadata {
    metadata: IBinninatorDatasetMetadata
}

export type IFullDocForImport = Pick<IDocument, 'data' | 'attrs' | 'label' | 'slug' | 'description'>

export type ImportProvenance = {
    sourceId: string
    externalId: string
}

export type ImportCandidate<T = unknown> = IDocumentImport<T> & {
    provenance: ImportProvenance
}

export type CanonicalImportRecord<T = unknown> = IFullDocForImport & {
    uuid: string
    data: T
    provenance: ImportProvenance
    sourceData: unknown
}

export type ImportDiscoveryOptions = {
    url: string
    signal: AbortSignal
}

export type ImportLoadOptions = {
    candidate: ImportCandidate
    detailRoot?: string
    signal?: AbortSignal
}

export type ImportRelationshipRule = {
    parentObjectTypeSlug: string
    childObjectTypeSlug: string
    parentMatchField?: string
    childMatchField?: string
    predicate: string
    existingParentPolicy?: 'lookup'
}

export type ImportArraySourceTarget = {
    parentSourceKey: string
    arrayFieldPath: string
    parentMatchField: string
    rowMatchField: string
}

export type ImportWorkflowMode = 'simplified' | 'interactive'

export type ImportReviewStep = 'mapping' | 'type-schema' | 'overrides' | 'relationships' | 'review'

export type ImportWorkflowInput = {
    key: string
    label: string
    step: ImportReviewStep
    required?: boolean
}

export type ImportWorkflowPolicy = {
    mode?: ImportWorkflowMode
    reviewSteps?: ImportReviewStep[]
    inputs?: ImportWorkflowInput[]
    allowAutomaticTypeCreation?: boolean
    defaultConflictAction?: 'ignore' | 'overwrite' | 'merge'
}

export type ImportReadinessDecision =
    | { status: 'advance'; action: 'prepare' | 'create-type' | 'validate' | 'reconcile' | 'execute' }
    | { status: 'needs-input'; step: ImportReviewStep; inputKeys?: string[] }
    | { status: 'blocked'; reason: 'busy' | 'source-error' | 'permission' | 'invalid-records' | 'ambiguous-matches' | 'relationships' | 'execution-errors' }
    | { status: 'complete' }

export type ImportSourceAdapter = {
    id: string
    defaultImportUrl: string
    defaultDetailRoot?: string
    relationshipRules?: ImportRelationshipRule[]
    arrayTarget?: ImportArraySourceTarget
    sourceKey?: string
    schema?: JSONSchema6
    discover: (options: ImportDiscoveryOptions) => Promise<ImportCandidate[]>
    load: (options: ImportLoadOptions) => Promise<CanonicalImportRecord>
}

export type ImportCompositeSourceAdapter = {
    id: string
    memberSourceIds: [string, string]
    defaultImportUrl: string
    discover: ImportSourceAdapter['discover']
    load: (options: ImportLoadOptions) => Promise<Record<string, CanonicalImportRecord>>
}