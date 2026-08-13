import type { IAssetForm, IObjectSchema, IObjectType, IPerson, IPredicate } from ***REMOVED***@/types/types***REMOVED***
import { atom } from ***REMOVED***jotai***REMOVED***

const contextStateAtom = atom({
    loaded: false,
    predicates: [] as IPredicate[],
    predicates_by_uuid: {} as Record<string, IPredicate>,
    predicates_by_predicate: {} as Record<string, IPredicate>,
    object_categories: [] as string[],
    object_types: [] as IObjectType[],
    object_types_by_uuid: {} as Record<string, IObjectType>,
    object_types_by_slug: {} as Record<string, IObjectType>,
    object_schemas: [] as IObjectSchema[],
    object_schemas_by_uuid: {} as Record<string, IObjectSchema>,
    object_schemas_by_slug: {} as Record<string, IObjectSchema>,
    object_schema_defaults_by_object_type_uuid: {} as Record<string, IObjectSchema>,
    forms: [] as IAssetForm[],
    forms_by_uuid: {} as Record<string, IAssetForm>,
    forms_by_slug: {} as Record<string, IAssetForm>,
    form_defaults_by_object_type_uuid: {} as Record<string, IAssetForm>,
    forms_by_object_type_uuid: {} as Record<string, IAssetForm[]>,
    persons: [] as IPerson[],
    persons_by_owner_sub: {} as Record<string, IPerson>,
})

export default contextStateAtom
