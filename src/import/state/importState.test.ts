import { describe, expect, it } from 'vitest'
import {
    createImportSession,
    getImportEligibleRecords,
    importRecordKey,
    isValidationComplete,
    setDiscoveredCandidates,
    setImportRecordResult,
    setImportConflictAction,
    setImportReconciliations,
    setImportSchema,
    setImportValidationResults,
    setLoadedRecords,
} from './importState'

const candidate = {
    uuid: 'transport-1',
    slug: 'record-1',
    label: 'Record 1',
    data: { preview: true },
    provenance: { sourceId: 'source-a', externalId: 'external-1' },
}

describe('import session transitions', () => {
    it('resets source-specific work when new candidates are discovered', () => {
        const previous = {
            ...createImportSession('source-a'),
            records: [{ ...candidate, description: '', attrs: {}, sourceData: candidate.data }],
            selectedObjectType: {
                uuid: 'type-1',
                owner_sub: 'test-user',
                label: 'Test type',
                slug: 'test-type',
                category: 'test',
                created_at: '2026-09-19T00:00:00Z',
                updated_at: '2026-09-19T00:00:00Z',
            },
        }

        const session = setDiscoveredCandidates(previous, [candidate])

        expect(session.sourceId).toBe('source-a')
        expect(session.records).toEqual([])
        expect(session.selectedObjectType).toBeUndefined()
        expect(session.recordResults[importRecordKey(candidate)]).toEqual({ stage: 'discovered' })
    })

    it('marks canonical records loaded without changing another source session', () => {
        const sourceA = setDiscoveredCandidates(createImportSession('source-a'), [candidate])
        const sourceB = createImportSession('source-b')
        const record = { ...candidate, description: '', attrs: {}, sourceData: candidate.data }

        const loadedSourceA = setLoadedRecords(sourceA, [record])

        expect(loadedSourceA.records).toEqual([record])
        expect(loadedSourceA.recordResults[importRecordKey(record)]).toEqual({ stage: 'loaded' })
        expect(sourceB).toEqual(createImportSession('source-b'))
    })

    it('records an actionable failure for one record', () => {
        const session = setDiscoveredCandidates(createImportSession('source-a'), [candidate])

        const failed = setImportRecordResult(session, candidate, {
            stage: 'failed',
            error: 'Remote detail request failed',
        })

        expect(failed.recordResults[importRecordKey(candidate)]).toEqual({
            stage: 'failed',
            error: 'Remote detail request failed',
        })
        expect(failed.records).toBe(session.records)
        expect(failed.validationResults).toBe(session.validationResults)
    })

    it('clears stale validation when the schema changes', () => {
        const record = { ...candidate, description: '', attrs: {}, sourceData: candidate.data }
        const loaded = setLoadedRecords(createImportSession('source-a'), [record])
        const validated = setImportValidationResults(loaded, [
            { record, result: { isValid: true, errors: [] } },
        ])

        const changed = setImportSchema(validated, { type: 'object' })

        expect(changed.schema).toEqual({ type: 'object' })
        expect(changed.validationResults).toEqual({})
        expect(isValidationComplete(changed)).toBe(false)
    })

    it('allows only validated records unless invalid records are explicitly included', () => {
        const validRecord = { ...candidate, description: '', attrs: {}, sourceData: candidate.data }
        const invalidRecord = {
            ...validRecord,
            uuid: 'transport-2',
            provenance: { sourceId: 'source-a', externalId: 'external-2' },
        }
        const loaded = setLoadedRecords(createImportSession('source-a'), [validRecord, invalidRecord])
        const validated = setImportValidationResults(loaded, [
            { record: validRecord, result: { isValid: true, errors: [] } },
            { record: invalidRecord, result: { isValid: false, errors: ['Required field missing'] } },
        ])

        expect(isValidationComplete(validated)).toBe(true)
        expect(getImportEligibleRecords(validated)).toEqual([validRecord])
        expect(getImportEligibleRecords({ ...validated, includeInvalidRecords: true })).toEqual([
            validRecord,
            invalidRecord,
        ])
    })

    it('stores reconciliation and allows a conflict action to be changed', () => {
        const record = { ...candidate, description: '', attrs: {}, sourceData: candidate.data }
        const reconciliation = {
            record,
            status: 'conflicting' as const,
            action: 'ignore' as const,
            existingDocuments: [],
        }
        const reconciled = setImportReconciliations(createImportSession('source-a'), [reconciliation])

        const changed = setImportConflictAction(reconciled, record, 'merge')

        expect(changed.reconciliations?.[0].action).toBe('merge')
        expect(changed.recordResults[importRecordKey(record)]).toEqual({ stage: 'reconciled' })
    })
})