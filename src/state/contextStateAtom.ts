import type { IAssetForm, IObjectSchema, IObjectType, IPerson, IPredicate } from ***REMOVED***@/types/types***REMOVED***
import { atom } from ***REMOVED***jotai***REMOVED***

export const makeInitialContextState = () => ({
    loaded: false,
    predicate: [] as IPredicate[],
    predicate_by_uuid: {} as Record<string, IPredicate>,
    predicate_by_predicate: {} as Record<string, IPredicate>,
    object_category: [] as string[],
    object_type: [] as IObjectType[],
    object_type_by_uuid: {} as Record<string, IObjectType>,
    object_type_by_slug: {} as Record<string, IObjectType>,
    object_schema: [] as IObjectSchema[],
    object_schema_by_uuid: {} as Record<string, IObjectSchema>,
    object_schema_by_slug: {} as Record<string, IObjectSchema>,
    object_schema_defaults_by_object_type_uuid: {} as Record<string, IObjectSchema>,
    form: [] as IAssetForm[],
    form_by_uuid: {} as Record<string, IAssetForm>,
    form_by_slug: {} as Record<string, IAssetForm>,
    form_default_by_object_type_uuid: {} as Record<string, IAssetForm>,
    form_by_object_type_uuid: {} as Record<string, IAssetForm[]>,
    person: [] as IPerson[],
    person_by_owner_sub: {} as Record<string, IPerson>,
})

const contextStateAtom = atom(makeInitialContextState())

export const contextReloadTokenAtom = atom(0)

export const requestContextReloadAtom = atom(null, (get, set) => {
    set(contextReloadTokenAtom, get(contextReloadTokenAtom) + 1)
})

export default contextStateAtom
