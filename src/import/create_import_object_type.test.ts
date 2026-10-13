import { describe, expect, it, vi } from 'vitest'
import type { IObjectType } from '@/types/types'
import type { fetchObjectTypes } from '@/manage/object_type/services'
import type { fetchObjectSchemas, postObjectSchema } from '@/manage/object_schema/services'
import {
    canAutomaticallyCreateImportType,
    createImportAllTypeCreationAdapter,
    createImportedObjectTypeAndSchema,
} from './create_import_object_type'

describe('automatic import type creation', () => {
    it('creates the filename-derived type before its default schema', async () => {
        const calls: string[] = []
        const objectType = { uuid: 'type-1' } as IObjectType
        const createObjectType = vi.fn(async () => {
            calls.push('type')
            return objectType
        })
        const createObjectSchema = vi.fn(async () => {
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

    it('looks up an existing type first and preserves the caller schema while refreshing its default schema', async () => {
        const objectType = { uuid: 'existing-type', slug: 'field_test_01' } as IObjectType
        const defaultSchema = {
            object_type_uuid: objectType.uuid,
            is_type_default: true,
            json_schema: { type: 'string' },
        }
        const fetchTypes = vi.fn(async () => [objectType])
        const fetchSchemas = vi.fn(async () => [defaultSchema] as unknown as Awaited<ReturnType<typeof fetchObjectSchemas>>)
        const createType = vi.fn(async () => objectType)
        const pinnedSchema = { type: 'object' as const }
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes,
            fetchSchemas,
            createType,
            inferSchema: vi.fn(async () => ({ type: 'number' as const })),
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']

        const result = await adapter({
            source,
            plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            schema: pinnedSchema,
            token: 'test-token',
            signal: new AbortController().signal,
        })

        expect(result).toEqual({ objectTypeUuid: objectType.uuid, schema: pinnedSchema })
        expect(createType).not.toHaveBeenCalled()
        expect(fetchSchemas).toHaveBeenCalledTimes(1)
    })

    it('creates an inferred default schema and refreshes it with the same abort signal', async () => {
        const objectType = { uuid: 'created-type', slug: 'field_test_01' } as IObjectType
        const inferredSchema = { type: 'object' as const, properties: { name: { type: 'string' as const } } }
        let refreshedSchemas: Awaited<ReturnType<typeof fetchObjectSchemas>> = []
        const signal = new AbortController().signal
        const fetchTypes = vi.fn(async () => [])
        const fetchSchemas = vi.fn(async () => refreshedSchemas)
        const createType = vi.fn(async () => objectType)
        const createSchema = vi.fn(async (input: Parameters<typeof postObjectSchema>[0]) => {
            refreshedSchemas = [{
                uuid: 'schema-1',
                object_type_uuid: objectType.uuid,
                is_type_default: true,
                json_schema: input.object_schema.json_schema,
            } as Awaited<ReturnType<typeof postObjectSchema>>]
            return refreshedSchemas[0]
        })
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes,
            fetchSchemas,
            createType,
            createSchema,
            inferSchema: vi.fn(async () => inferredSchema),
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']

        const result = await adapter({
            source,
            plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            token: 'test-token',
            signal,
        })

        expect(result).toEqual({ objectTypeUuid: objectType.uuid, schema: inferredSchema })
        expect(createSchema).toHaveBeenCalledWith(expect.objectContaining({
            object_schema: expect.objectContaining({ json_schema: inferredSchema }),
            signal,
        }))
        expect(fetchSchemas).toHaveBeenCalledTimes(2)
    })

    it('does not report success when the created default schema cannot be refreshed', async () => {
        const objectType = { uuid: 'type-1', slug: 'field_test_01' } as IObjectType
        const createSchema = vi.fn(async () => ({} as Awaited<ReturnType<typeof postObjectSchema>>))
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes: vi.fn(async () => [objectType]),
            fetchSchemas: vi.fn(async () => []),
            createSchema,
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']

        await expect(adapter({
            source, plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            schema: { type: 'object' }, token: 'test-token', signal: new AbortController().signal,
        })).rejects.toThrow('Could not resolve the default schema')
        expect(createSchema).toHaveBeenCalledTimes(1)
    })

    it('does not call services on pre-abort or write a schema after inference is cancelled', async () => {
        const controller = new AbortController()
        const objectType = { uuid: 'type-1', slug: 'field_test_01' } as IObjectType
        const fetchTypes = vi.fn(async () => [objectType])
        const createSchema = vi.fn(async () => ({} as Awaited<ReturnType<typeof postObjectSchema>>))
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes, fetchSchemas: vi.fn(async () => []), createSchema,
            inferSchema: vi.fn(async () => {
                controller.abort()
                return { type: 'object' as const }
            }),
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']
        const options = {
            source, plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            token: 'test-token', signal: controller.signal,
        }
        await expect(adapter(options)).rejects.toMatchObject({ name: 'AbortError' })
        expect(createSchema).not.toHaveBeenCalled()
        fetchTypes.mockClear()
        await expect(adapter(options)).rejects.toMatchObject({ name: 'AbortError' })
        expect(fetchTypes).not.toHaveBeenCalled()
    })

    it('propagates unrelated creation errors without attempting race recovery', async () => {
        const fetchTypes = vi.fn(async () => [])
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes,
            createType: vi.fn(async () => { throw new Error('Permission denied') }),
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']
        await expect(adapter({
            source, plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            token: 'test-token', signal: new AbortController().signal,
        })).rejects.toThrow('Permission denied')
        expect(fetchTypes).toHaveBeenCalledTimes(1)
    })

    it('recovers only a unique-slug creation race by reloading the type and its schema ownership', async () => {
        const objectType = { uuid: 'raced-type', slug: 'field_test_01' } as IObjectType
        const defaultSchema = {
            object_type_uuid: objectType.uuid,
            is_type_default: true,
            json_schema: { type: 'number' },
        }
        const fetchTypes = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([objectType])
        const fetchSchemas = vi.fn(async () => [defaultSchema] as unknown as Awaited<ReturnType<typeof fetchObjectSchemas>>)
        const createType = vi.fn(async () => {
            throw new Error('status: 409 duplicate key value violates unique constraint "object_type_slug_unique"')
        })
        const inferSchema = vi.fn(async () => ({ type: 'string' as const }))
        const adapter = createImportAllTypeCreationAdapter({
            fetchTypes: fetchTypes as typeof fetchObjectTypes,
            fetchSchemas,
            createType,
            inferSchema,
        })
        const source = { type: 'field_test_01', label: 'Field Test 01', sourceAdapter: { id: 'field_test_01' } } as Parameters<typeof adapter>[0]['source']

        const result = await adapter({
            source,
            plan: { records: [] } as unknown as Parameters<typeof adapter>[0]['plan'],
            token: 'test-token',
            signal: new AbortController().signal,
        })

        expect(result).toEqual({ objectTypeUuid: objectType.uuid, schema: defaultSchema.json_schema })
        expect(fetchTypes).toHaveBeenCalledTimes(2)
        expect(fetchSchemas).toHaveBeenCalledTimes(1)
        expect(inferSchema).not.toHaveBeenCalled()
    })
})