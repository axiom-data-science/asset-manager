export type IPostgrestFilter = {
  column: string,
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'cs' | 'cd' | 'sl' | 'sr' | 'nxl' | 'nxr',
  value: string | number | (string | number)[],
  not?: boolean
}

export type IPostgrestParams<T = Record<string, string>> = {
  limit?: number
  offset?: number
  order?: ({
    column: string | keyof T
    dir: 'asc' | 'desc'
  })[],
  select?: (string | {
    column: string | keyof T
    fn?: 'count' | 'sum' | 'avg' | 'min' | 'max'
    as?: string
  })[],
  filters?: IPostgrestFilter[]
}


export type IDocument<T = Record<string, unknown>, A = Record<string, unknown>, J = Record<string, unknown>> = {
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