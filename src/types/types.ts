export type IPostgrestFilter = {
  column: string
  operator:
    | ***REMOVED***eq***REMOVED***
    | ***REMOVED***neq***REMOVED***
    | ***REMOVED***gt***REMOVED***
    | ***REMOVED***gte***REMOVED***
    | ***REMOVED***lt***REMOVED***
    | ***REMOVED***lte***REMOVED***
    | ***REMOVED***like***REMOVED***
    | ***REMOVED***ilike***REMOVED***
    | ***REMOVED***in***REMOVED***
    | ***REMOVED***is***REMOVED***
    | ***REMOVED***cs***REMOVED***
    | ***REMOVED***cd***REMOVED***
    | ***REMOVED***sl***REMOVED***
    | ***REMOVED***sr***REMOVED***
    | ***REMOVED***nxl***REMOVED***
    | ***REMOVED***nxr***REMOVED***
  value: string | number | (string | number)[]
  not?: boolean
}

export type IPostgrestParams<T = Record<string, string>> = {
  limit?: number
  offset?: number
  order?: {
    column: string | keyof T
    dir: ***REMOVED***asc***REMOVED*** | ***REMOVED***desc***REMOVED***
  }[]
  select?: (
    | string
    | {
        column: string | keyof T
        fn?: ***REMOVED***count***REMOVED*** | ***REMOVED***sum***REMOVED*** | ***REMOVED***avg***REMOVED*** | ***REMOVED***min***REMOVED*** | ***REMOVED***max***REMOVED***
        as?: string
        join?: {
          table: string
          fields?: string[]
        }
      }
  )[]
  filters?: IPostgrestFilter[]
}

export type IDefaultDocumentType = Record<string, string | number | boolean | null>
export type IDefaultDocumentAttributes = Record<string, string | number | boolean | null>

export type IDocument<T = IDefaultDocumentType, A = IDefaultDocumentAttributes> = {
  uuid: string
  slug: string
  published: boolean
  published_at: string | null
  owner_sub: string
  lock_sub: string | null
  locked_at: string | null
  subs_for_select: string[]
  roles_for_select: string[]
  subs_for_update: string[]
  roles_for_update: string[]
  data: T | null
  attrs: A | null
  created_at: string
  updated_at: string | null
  object_type_uuid: string
  label: string
  description: string
  comments?: string
}

export type IPredicate = {
  uuid: string
  predicate: string
  label: string
  inverse_label?: string | null
  is_directional: boolean
}

export type IRelationship = {
  uuid: string
  from_document_uuid: string
  to_document_uuid: string
  predicate_uuid: string
  data?: JSON
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

export interface IObjectType {
  uuid: string
  owner_sub: string
  label: string
  slug: string
  category: string
  description?: string
  created_at: string
  updated_at: string
}

export interface IObjectSchema {
  uuid: string
  owner_sub: string
  slug: string
  label: string
  description?: string
  version: number
  is_type_default: boolean
  created_at: string
  updated_at: string
  object_type_uuid: string
  json_schema: Record<string, unknown>
}

export interface IObjectSchemaWithObjectType extends IObjectSchema {
  object_type: IObjectType
}

export interface IDocumentForUpdate {
  uuid?: string
  owner_sub?: string
  lock_sub?: string
  locked_at?: string
  subs_for_select?: string[]
  roles_for_select?: string[]
  subs_for_update?: string[]
  roles_for_update?: string[]
  data?: Record<string, unknown>
  attrs?: Record<string, unknown>
  json_schema?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  type?: string
  label?: string
  description?: string
  comments?: string
}

export interface IDocumentRevision {
  _revision_created?: number
  _revision_expired?: number
  uuid?: string
  owner_sub?: string
  lock_sub?: string
  locked_at?: string
  subs_for_select?: string[]
  roles_for_select?: string[]
  subs_for_update?: string[]
  roles_for_update?: string[]
  data?: Record<string, unknown>
  attrs?: Record<string, unknown>
  json_schema?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  type?: string
  label?: string
  description?: string
  comments?: string
}

export interface IFormOverrideConfig {
  uuid: string
  owner_sub: string
  label: string
  description?: string
  created_at: string
  updated_at: string
  form_uuid?: string
  is_type_default: boolean
  config: Record<string, unknown>
}

export interface IPerson {
  uuid: string
  owner_sub: string
  lock_sub?: string
  locked_at?: string
  subs_for_select: string[]
  roles_for_select: string[]
  subs_for_update: string[]
  roles_for_update: string[]
  data: Record<string, unknown>
  attrs: Record<string, unknown>
  json_schema: Record<string, unknown>
  created_at: string
  updated_at: string
  type: string
  label: string
  description: string
  comments: string
}

export interface IAssetFormFieldsOverrideConfig {
  uuid: string
  owner_sub: string
  form_uuid?: string
  config: Array<Record<string, unknown>>
  created_at: string
  updated_at: string
}

export interface IAssetForm {
  uuid: string
  owner_sub: string
  slug: string
  label: string
  description?: string
  created_at: string
  updated_at: string
  object_type_uuid: string
  object_schema_version: number
  is_schema_and_version_default: boolean
  form_config: Record<string, unknown>
  schema_override_config: Record<string, unknown>
  use_form_config: boolean
}

export interface IFieldOverrideConfig {
  uuid: string
  label: string
  description?: string
  owner_sub: string
  object_schema_uuid: string
  object_schema_version: number
  created_at: string
  updated_at: string
  config: JSON
}

export interface IFormToFieldConfig {
  uuid: string
  owner_sub: string
  form_uuid: string
  fields_override_config_uuid: string
  weight?: number
  created_at: string
  updated_at: string
}

export interface IFormToFieldConfigWithDetails extends IFormToFieldConfig {
  fields_override_config: IFieldOverrideConfig
}

export type IRollup = { label: string; count: number }

export type IValidationError = { field: string; path?: string; message: string }
