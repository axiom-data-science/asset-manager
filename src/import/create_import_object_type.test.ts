import { describe, expect, it, vi } from 'vitest'
import type { IObjectType } from '@/types/types'
import type { postObjectType } from '@/manage/object_type/services'
import type { postObjectSchema } from '@/manage/object_schema/services'
import {
    canAutomaticallyCreateImportType,
    createImportedObjectTypeAndSchema,
} from './create_import_object_type'

describe('automatic import type creation', () => {
    it('creates the filename-derived type before its default schema', async () => {
        const calls: string[] = []
        const objectType = { uuid: 'type-1' } as IObjectType
        const createObjectType = vi.fn(async (_input: Parameters<typeof postObjectType>[0]) => {
            calls.push('type')
            return objectType
        })
        const createObjectSchema = vi.fn(async (_input: Parameters<typeof postObjectSchema>[0]) => {
            calls.push('schema')
            return {} as Awaited<ReturnType<typeof postObjectSchema>>
        })
        const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } } }

        const result = await createImportedObjectTypeAndSchema({
            type: 'field_test_01',
            label: 'Field Test 01',
            schema,
            token: 'test-token',
            createObjectType,
            createObjectSchema,
        })

        expect(result).toBe(objectType)
        expect(calls).toEqual(['type', 'schema'])
        expect(createObjectType).toHaveBeenCalledWith({
            object_type: {
                category: 'document',
                label: 'Field Test 01',
                slug: 'field_test_01',
            },
            token: 'test-token',
        })
        expect(createObjectSchema).toHaveBeenCalledWith({
            object_schema: {
                object_type_uuid: 'type-1',
                label: 'Field Test 01 default schema',
                slug: 'field_test_01_default',
                description: 'Automatically generated from imported records.',
                version: 1,
                is_type_default: true,
                json_schema: schema,
            },
            token: 'test-token',
        })
    })

    it('does not allow automatic creation without a schema, token, or when the slug exists', () => {
        const schema = { type: 'object' as const }

        expect(canAutomaticallyCreateImportType(schema, undefined, 'token')).toBe(true)
        expect(canAutomaticallyCreateImportType(null, undefined, 'token')).toBe(false)
        expect(canAutomaticallyCreateImportType(schema, undefined, undefined)).toBe(false)
        expect(canAutomaticallyCreateImportType(schema, { uuid: 'existing' } as IObjectType, 'token')).toBe(false)
    })
})