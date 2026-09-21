import { describe, expect, it, vi } from 'vitest'
import {
    createImportAllSourcePlan,
    discoverImportAllSource,
    executeImportAllSource,
    importAllRecordKey,
    refreshImportAllSourceReconciliation,
    prepareImportAllSource,
    summarizeImportAllPlan,
} from './import_all_plan'
import type { ImportAllPlanSource } from './import_all_plan'
import type { IDocument } from '@/types/types'

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

    it('executes valid records using defaults and per-record overrides', async () => {
        const configuredSource = source()
        const newRecord = {
            uuid: '1', slug: 'new', label: 'New', data: { value: 1 },
            attrs: {}, description: '', sourceData: {},
            provenance: { sourceId: 'source-a', externalId: '1' },
        }
        const existingRecord = {
            ...newRecord, uuid: '2', slug: 'existing', label: 'Incoming',
            provenance: { sourceId: 'source-a', externalId: '2' },
        }
        const invalidRecord = {
            ...newRecord, uuid: '3', slug: 'invalid',
            provenance: { sourceId: 'source-a', externalId: '3' },
        }
        const ambiguousRecord = {
            ...newRecord, uuid: '4', slug: 'ambiguous',
            provenance: { sourceId: 'source-a', externalId: '4' },
        }
        const existing = {
            uuid: 'existing-uuid', object_type_uuid: 'type-1', slug: 'existing',
            label: 'Existing', description: 'Keep', data: { old: true }, attrs: {},
        } as IDocument
        const post = vi.fn().mockResolvedValue({ uuid: 'created-uuid' })
        const patch = vi.fn().mockResolvedValue({})
        const mergeRpc = vi.fn().mockResolvedValue({})
        const fetchBySlug = vi.fn().mockResolvedValue(undefined)
        const plan = {
            ...createImportAllSourcePlan(configuredSource),
            records: [newRecord, existingRecord, invalidRecord, ambiguousRecord],
            validationResults: [
                { record: newRecord, isValid: true, errors: [] },
                { record: existingRecord, isValid: true, errors: [] },
                { record: invalidRecord, isValid: false, errors: ['bad'] },
                { record: ambiguousRecord, isValid: true, errors: [] },
            ],
            reconciliations: [
                { record: newRecord, status: 'new' as const, action: 'create' as const, existingDocuments: [] },
                { record: existingRecord, status: 'conflicting' as const, existingDocuments: [existing] },
                { record: invalidRecord, status: 'new' as const, action: 'create' as const, existingDocuments: [] },
                { record: ambiguousRecord, status: 'ambiguous' as const, existingDocuments: [existing] },
            ],
            defaultConflictAction: 'ignore' as const,
            conflictActions: { [importAllRecordKey(existingRecord)]: 'merge' as const },
        }

        const executed = await executeImportAllSource({
            plan,
            objectTypeUuid: 'type-1',
            signal: new AbortController().signal,
            mergeStrategy: 'client-patch',
            persistence: { post, patch, mergeRpc, fetchBySlug },
        })

        expect(post).toHaveBeenCalledTimes(1)
        expect(patch).toHaveBeenCalledWith('existing-uuid', expect.objectContaining({ data: { old: true, value: 1 } }), expect.any(AbortSignal))
        expect(mergeRpc).not.toHaveBeenCalled()
        expect(fetchBySlug).toHaveBeenCalledWith('new', 'type-1', expect.any(AbortSignal))
        expect(executed.executionResults.map(({ status }) => status)).toEqual([
            'imported', 'imported', 'blocked', 'blocked',
        ])
        expect(executed.executionResults[0].documentUuid).toBe('created-uuid')
    })

    it('records a late create conflict without writing over it', async () => {
        const configuredSource = source()
        const record = {
            uuid: '1', slug: 'late', label: 'Late', data: {}, attrs: {}, description: '', sourceData: {},
            provenance: { sourceId: 'source-a', externalId: '1' },
        }
        const plan = {
            ...createImportAllSourcePlan(configuredSource),
            records: [record],
            validationResults: [{ record, isValid: true, errors: [] }],
            reconciliations: [{ record, status: 'new' as const, action: 'create' as const, existingDocuments: [] }],
        }
        const post = vi.fn()
        const executed = await executeImportAllSource({
            plan,
            objectTypeUuid: 'type-1',
            signal: new AbortController().signal,
            mergeStrategy: 'client-patch',
            persistence: {
                post,
                patch: vi.fn(),
                mergeRpc: vi.fn(),
                fetchBySlug: vi.fn().mockResolvedValue({ uuid: 'already-there' }),
            },
        })

        expect(post).not.toHaveBeenCalled()
        expect(executed.executionResults[0]).toMatchObject({ status: 'failed', action: 'create' })
    })

    it('executes only selected record keys for retry', async () => {
        const configuredSource = source()
        const records = ['1', '2'].map((externalId) => ({
            uuid: externalId,
            slug: `record-${externalId}`,
            label: externalId,
            data: {},
            attrs: {},
            description: '',
            sourceData: {},
            provenance: { sourceId: 'source-a', externalId },
        }))
        const plan = {
            ...createImportAllSourcePlan(configuredSource),
            records,
            validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
            reconciliations: records.map((record) => ({
                record,
                status: 'new' as const,
                action: 'create' as const,
                existingDocuments: [],
            })),
        }
        const post = vi.fn().mockResolvedValue({})
        const executed = await executeImportAllSource({
            plan,
            objectTypeUuid: 'type-1',
            signal: new AbortController().signal,
            mergeStrategy: 'client-patch',
            recordKeys: new Set([importAllRecordKey(records[1])]),
            persistence: {
                post,
                patch: vi.fn(),
                mergeRpc: vi.fn(),
                fetchBySlug: vi.fn().mockResolvedValue(undefined),
            },
        })

        expect(post).toHaveBeenCalledTimes(1)
        expect(post.mock.calls[0][0]).toEqual(expect.objectContaining({ slug: 'record-2' }))
        expect(executed.executionResults).toHaveLength(1)
        expect(executed.executionResults[0].recordKey).toBe(importAllRecordKey(records[1]))
    })

    it('refreshes reconciliation only for selected retry records', async () => {
        const configuredSource = source()
        const records = ['1', '2'].map((externalId) => ({
            uuid: externalId,
            slug: `record-${externalId}`,
            label: externalId,
            data: { value: externalId },
            attrs: {},
            description: '',
            sourceData: {},
            provenance: { sourceId: 'source-a', externalId },
        }))
        const plan = {
            ...createImportAllSourcePlan(configuredSource),
            records,
            validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
            reconciliations: records.map((record) => ({
                record,
                status: 'conflicting' as const,
                action: 'overwrite' as const,
                existingDocuments: [],
            })),
        }
        const existing = {
            uuid: 'existing-1', object_type_uuid: 'type-1', slug: 'record-1', label: '1',
            description: '', data: { value: 'record-1' }, attrs: {},
        } as IDocument
        const fetchExisting = vi.fn().mockResolvedValue([existing])

        const refreshed = await refreshImportAllSourceReconciliation({
            plan,
            recordKeys: new Set([importAllRecordKey(records[0])]),
            objectTypeUuid: 'type-1',
            token: 'token',
            signal: new AbortController().signal,
            fetchExisting,
        })

        expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({ records: [records[0]] }))
        expect(refreshed.reconciliations[0]).toMatchObject({ status: 'conflicting' })
        expect(refreshed.reconciliations[1]).toMatchObject({ status: 'conflicting', action: 'overwrite' })
    })
})