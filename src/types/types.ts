export type IPostgrestFilter = {
  column: string,
  operator: ***REMOVED***eq***REMOVED*** | ***REMOVED***neq***REMOVED*** | ***REMOVED***gt***REMOVED*** | ***REMOVED***gte***REMOVED*** | ***REMOVED***lt***REMOVED*** | ***REMOVED***lte***REMOVED*** | ***REMOVED***like***REMOVED*** | ***REMOVED***ilike***REMOVED*** | ***REMOVED***in***REMOVED*** | ***REMOVED***is***REMOVED*** | ***REMOVED***cs***REMOVED*** | ***REMOVED***cd***REMOVED*** | ***REMOVED***sl***REMOVED*** | ***REMOVED***sr***REMOVED*** | ***REMOVED***nxl***REMOVED*** | ***REMOVED***nxr***REMOVED***,
  value: string | number | (string | number)[],
  not?: boolean
}

export type IPostgrestParams<T = Record<string, string>> = {
  limit?: number
  offset?: number
  order?: ({
    column: string | keyof T
    dir: ***REMOVED***asc***REMOVED*** | ***REMOVED***desc***REMOVED***
  })[],
  select?: (string | {
    column: string | keyof T
    fn?: ***REMOVED***count***REMOVED*** | ***REMOVED***sum***REMOVED*** | ***REMOVED***avg***REMOVED*** | ***REMOVED***min***REMOVED*** | ***REMOVED***max***REMOVED***
    as?: string
  })[],
  filters?: IPostgrestFilter[]
}

export type IDefaultDocumentType = Record<string, string | number | boolean | null>


export type IDocument<T = IDefaultDocumentType, A = IDefaultDocumentType, J = IDefaultDocumentType> = {
    uuid: string,
    owner_sub: string
    lock_sub: string | null
    locked_at: string | null
    subs_for_select: string[]
    roles_for_select: string[]
    subs_for_update: string[]
    roles_for_update: string[]
    data: T | null
    attrs: A | null
    json_schema: J | null
    created_at: string
    updated_at: string | null
    type: string
    label: string
    description: string
    comments: string
}


export type IDocumentType = {
    label: string
    description: string
    id: string
}

export type IDocumentSchema = {
  version: number
  schema: Record<string, unknown>
}

export type IAuth = {
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  login: () => Promise<void>
  user?: {
    access_token: string
    expires_at: Date 
    scope: string[]
    profile: {
      sub?: string | null
      name?: string | null
      email?: string | null
      firstName?: string | null
      lastName?: string | null
      [key: string]: unknown
    }
  } | null
}