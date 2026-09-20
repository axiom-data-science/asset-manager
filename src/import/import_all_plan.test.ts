import { describe, expect, it, vi } from 'vitest'
import {
    createImportAllSourcePlan,
    discoverImportAllSource,
    prepareImportAllSource,
    summarizeImportAllPlan,
} from './import_all_plan'
import type { ImportAllPlanSource } from './import_all_plan'

const source = (discover = vi.fn().mockResolvedValue([])): ImportAllPlanSource => ({
    type: 'source-a',
    label: 'Source A',
    sourceAdapter: {
        id: 'source-a',
        defaultImportUrl: 'https://example.test/records',
        discover,
        load: vi.fn(),
    },
})

describe('Import All discovery plan', () => {
    it('discovers through the adapter and applies the review limit', async () => {
        const discover = vi.fn().mockResolvedValue([
            { uuid: '1', slug: '1', label: 'One', data: {}, provenance: { sourceId: 'source-a', externalId: '1' } },
            { uuid: '2', slug: '2', label: 'Two', data: {}, provenance: { sourceId: 'source-a', externalId: '2' } },
        ])
        const configuredSource = source(discover)
        const plan = createImportAllSourcePlan(configuredSource)

        const discovered = await discoverImportAllSource({
            source: configuredSource,
            plan,
            limit: 1,
            signal: new AbortController().signal,
        })

        expect(discover).toHaveBeenCalledWith({
            url: 'https://example.test/records',
            signal: expect.any(AbortSignal),
        })
        expect(discovered.status).toBe('ready')
        expect(discovered.candidates).toHaveLength(1)
    })

    it('keeps source failures in the review plan', async () => {
        const configuredSource = source(vi.fn().mockRejectedValue(new Error('Source unavailable')))

        const discovered = await discoverImportAllSource({
            source: configuredSource,
            plan: createImportAllSourcePlan(configuredSource),
            signal: new AbortController().signal,
        })

        expect(discovered).toMatchObject({
            status: 'error',
            candidates: [],
            error: 'Source unavailable',
        })
    })

    it('summarizes only enabled ready sources', () => {
        const base = createImportAllSourcePlan(source())
        expect(summarizeImportAllPlan([
            { ...base, status: 'ready', candidates: [{ uuid: '1' }] as never },
            { ...base, sourceId: 'b', type: 'b', enabled: false, status: 'ready', candidates: [{ uuid: '2' }] as never },
            { ...base, sourceId: 'c', type: 'c', status: 'error', error: 'Failed' },
        ])).toEqual({
            enabledSources: 2,
            readySources: 1,
            failedSources: 1,
            preparedSources: 0,
            preparationErrors: 0,
            records: 1,
            validRecords: 0,
            invalidRecords: 0,
            conflicts: 0,
        })
    })

    it('loads, validates, and reconciles valid records while retaining invalid results', async () => {
        const load = vi.fn(async ({ candidate }) => ({
            ...candidate,
            description: '',
            attrs: {},
            sourceData: candidate.data,
        }))
        const configuredSource = source()
        configuredSource.sourceAdapter.load = load
        const discovered = {
            ...createImportAllSourcePlan(configuredSource),
            status: 'ready' as const,
            candidates: [
                { uuid: '1', slug: 'one', label: 'One', data: { valid: true }, provenance: { sourceId: 'source-a', externalId: '1' } },
                { uuid: '2', slug: 'two', label: 'Two', data: { valid: false }, provenance: { sourceId: 'source-a', externalId: '2' } },
            ],
        }
        const fetchExisting = vi.fn().mockResolvedValue([])

        const prepared = await prepareImportAllSource({
            source: configuredSource,
            plan: discovered,
            schema: { type: 'object' },
            objectTypeUuid: 'type-1',
            token: 'token',
            signal: new AbortController().signal,
            validator: (_schema, record) => ({
                isValid: (record.data as { valid: boolean }).valid,
                errors: (record.data as { valid: boolean }).valid ? [] : ['Invalid record'],
            }),
            fetchExisting,
        })

        expect(load).toHaveBeenCalledTimes(2)
        expect(prepared.preparationStatus).toBe('ready')
        expect(prepared.records).toHaveLength(2)
        expect(prepared.validationResults.map(({ isValid }) => isValid)).toEqual([true, false])
        expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({
            records: [expect.objectContaining({ slug: 'one' })],
            objectTypeUuid: 'type-1',
        }))
        expect(prepared.reconciliations).toEqual([
            expect.objectContaining({ status: 'new', action: 'create' }),
        ])
    })
})