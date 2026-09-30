import type { JSONSchema6 } from 'json-schema'
import type { IObjectType } from '@/types/types'
import type { postObjectType } from '@/manage/object_type/services'
import type { postObjectSchema } from '@/manage/object_schema/services'

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