import type { IDocument } from "@/types/types"

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

type ISearchRecordRoot= {
    uuid: string
    label: string
    id: string
    type: string
}


export type ISearchRecord<T = unknown> = ISearchRecordRoot &{
    source: T &  ISearchRecordRoot & Record<string, unknown>
    data: ISearchRecordRoot & Record<string, unknown>
}



export type IBinninatorColumnStorageType =
    | ***REMOVED***String***REMOVED***
    | ***REMOVED***Float64***REMOVED***
    | ***REMOVED***Bool***REMOVED***
    | ***REMOVED***DateTime64***REMOVED***
    | ***REMOVED***UInt64***REMOVED***
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
    available_time_bins: ***REMOVED*******REMOVED*** | string | string[]
}

export interface IBinninatorMetadata {
    metadata: IBinninatorDatasetMetadata
}

export type IFullDocForImport = Pick<IDocument, ***REMOVED***data***REMOVED*** | ***REMOVED***attrs***REMOVED*** | ***REMOVED***label***REMOVED*** | ***REMOVED***slug***REMOVED*** | ***REMOVED***description***REMOVED***>