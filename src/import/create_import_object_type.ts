import type { JSONSchema6 } from 'json-schema'
import type { IObjectType } from '@/types/types'
import type {
    fetchObjectTypes,
    postObjectType,
} from '@/manage/object_type/services'
import type {
    fetchObjectSchemas,
    postObjectSchema,
} from '@/manage/object_schema/services'
import type { ImportAllPlanSource, ImportAllSourcePlan } from './import_all_plan'

type ImportAllTypeCreationServices = {
    fetchObjectTypes: typeof fetchObjectTypes
    fetchObjectSchemas: typeof fetchObjectSchemas
    createObjectType: typeof postObjectType
    createObjectSchema: typeof postObjectSchema
    inferSchema: (source: ImportAllPlanSource, plan: ImportAllSourcePlan) => Promise<JSONSchema6>
}

const inferImportSchema = async (source: ImportAllPlanSource, plan: ImportAllSourcePlan) => {
    const [{ quicktypeJSON }, { findEnumProperties, removeAllEnumAtPath }] = await Promise.all([
        import('./pages/select_object_type_for_import'),
        import('./pages/select_object_type_for_import/schema_enum_utils'),
    ])
    const generated = await quicktypeJSON(
        'json-schema',
        source.type,
        plan.records.map((record) => JSON.stringify(record.data))
    )
    const generatedSchema = JSON.parse(generated.lines.join('\n')) as JSONSchema6
    const enumPaths = findEnumProperties(generatedSchema).map(({ path }) => path)
    return source.sourceAdapter.schema ?? removeAllEnumAtPath(generatedSchema, enumPaths)
}

const isObjectTypeSlugConflict = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return /status:\s*409/i.test(message) &&
        /duplicate key value violates unique constraint\s+["']?object_type_slug_unique["']?/i.test(message)
}

export const createImportAllTypeCreationAdapter = ({
    fetchTypes,
    fetchSchemas,
    createType,
    createSchema,
    inferSchema = inferImportSchema,
}: Partial<{
    fetchTypes: ImportAllTypeCreationServices['fetchObjectTypes']
    fetchSchemas: ImportAllTypeCreationServices['fetchObjectSchemas']
    createType: ImportAllTypeCreationServices['createObjectType']
    createSchema: ImportAllTypeCreationServices['createObjectSchema']
    inferSchema: ImportAllTypeCreationServices['inferSchema']
}> = {}) => async ({
    source,
    plan,
    schema,
    token,
    signal,
}: {
    source: ImportAllPlanSource
    plan: ImportAllSourcePlan
    schema?: JSONSchema6
    token: string
    signal: AbortSignal
}): Promise<{ objectTypeUuid: string; schema: JSONSchema6 }> => {
        signal.throwIfAborted()
        const types = await (fetchTypes
            ? fetchTypes({ token, signal })
            : import('@/manage/object_type/services').then((services) => services.fetchObjectTypes({ token, signal })))
        let objectType = types.find((candidate) => candidate.slug === source.type)

        if (!objectType) {
            signal.throwIfAborted()
            try {
                const input = {
                    object_type: {
                        category: 'document' as const,
                        label: source.label,
                        slug: source.type,
                    },
                    token,
                    signal,
                }
                objectType = await (createType
                    ? createType(input)
                    : import('@/manage/object_type/services').then((services) => services.postObjectType(input)))
            } catch (error) {
                if (!isObjectTypeSlugConflict(error)) throw error
                const refreshedTypes = await (fetchTypes
                    ? fetchTypes({ token, signal })
                    : import('@/manage/object_type/services').then((services) => services.fetchObjectTypes({ token, signal })))
                objectType = refreshedTypes.find(
                    (candidate) => candidate.slug === source.type
                )
                if (!objectType) throw error
            }
        }
        if (!objectType) throw new Error(`Could not resolve object type ${source.type}.`)

        signal.throwIfAborted()
        const schemas = await (fetchSchemas
            ? fetchSchemas({ token, signal })
            : import('@/manage/object_schema/services').then((services) => services.fetchObjectSchemas({ token, signal })))
        let defaultSchema = schemas.find(
            (candidate) => candidate.object_type_uuid === objectType.uuid && candidate.is_type_default
        )
        let resolvedSchema = schema
        if (!defaultSchema) {
            resolvedSchema ??= await inferSchema(source, plan)
            signal.throwIfAborted()
            const input = {
                object_schema: {
                    object_type_uuid: objectType.uuid,
                    label: `${source.label} default schema`,
                    slug: `${source.type}_default`,
                    description: `Automatically generated from ${source.label} import records.`,
                    version: 1,
                    is_type_default: true,
                    json_schema: resolvedSchema as Record<string, unknown>,
                },
                token,
                signal,
            }
            await (createSchema
                ? createSchema(input)
                : import('@/manage/object_schema/services').then((services) => services.postObjectSchema(input)))
            signal.throwIfAborted()
            const refreshedSchemas = await (fetchSchemas
                ? fetchSchemas({ token, signal })
                : import('@/manage/object_schema/services').then((services) => services.fetchObjectSchemas({ token, signal })))
            defaultSchema = refreshedSchemas.find(
                (candidate) => candidate.object_type_uuid === objectType.uuid && candidate.is_type_default
            )
        }
        if (!defaultSchema?.json_schema) {
            throw new Error(`Could not resolve the default schema for object type ${source.type}.`)
        }

        return {
            objectTypeUuid: objectType.uuid,
            schema: resolvedSchema ?? (defaultSchema.json_schema as JSONSchema6),
        }
    }

export const canAutomaticallyCreateImportType = (
    schema: JSONSchema6 | null | undefined,
    existingType: IObjectType | undefined,
    token: string | undefined
): schema is JSONSchema6 => Boolean(schema && !existingType && token)

export const createImportedObjectTypeAndSchema = async ({
    type,
    label,
    schema,
    token,
    createObjectType,
    createObjectSchema,
}: {
    type: string
    label?: string
    schema: JSONSchema6
    token: string
    createObjectType: typeof postObjectType
    createObjectSchema: typeof postObjectSchema
}): Promise<IObjectType> => {
    const displayLabel = label ?? type
    const objectType = await createObjectType({
        object_type: {
            category: 'document',
            label: displayLabel,
            slug: type,
        },
        token,
    })
    await createObjectSchema({
        object_schema: {
            object_type_uuid: objectType.uuid,
            label: `${displayLabel} default schema`,
            slug: `${type}_default`,
            description: 'Automatically generated from imported records.',
            version: 1,
            is_type_default: true,
            json_schema: schema as Record<string, unknown>,
        },
        token,
    })
    return objectType
}