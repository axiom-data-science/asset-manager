import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import {
  createImportSession,
  canSkipImportTypeStep,
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
} from ***REMOVED***./importState***REMOVED***

const candidate = {
  uuid: ***REMOVED***transport-1***REMOVED***,
  slug: ***REMOVED***record-1***REMOVED***,
  label: ***REMOVED***Record 1***REMOVED***,
  data: { preview: true },
  provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***external-1***REMOVED*** },
}

describe(***REMOVED***import session transitions***REMOVED***, () => {
  it(***REMOVED***resets source-specific work when new candidates are discovered***REMOVED***, () => {
    const previous = {
      ...createImportSession(***REMOVED***source-a***REMOVED***),
      records: [{ ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }],
      selectedObjectType: {
        uuid: ***REMOVED***type-1***REMOVED***,
        owner_sub: ***REMOVED***test-user***REMOVED***,
        label: ***REMOVED***Test type***REMOVED***,
        slug: ***REMOVED***test-type***REMOVED***,
        category: ***REMOVED***test***REMOVED***,
        created_at: ***REMOVED***2026-09-19T00:00:00Z***REMOVED***,
        updated_at: ***REMOVED***2026-09-19T00:00:00Z***REMOVED***,
      },
    }

    const session = setDiscoveredCandidates(previous, [candidate])

    expect(session.sourceId).toBe(***REMOVED***source-a***REMOVED***)
    expect(session.records).toEqual([])
    expect(session.selectedObjectType).toBeUndefined()
    expect(session.recordResults[importRecordKey(candidate)]).toEqual({ stage: ***REMOVED***discovered***REMOVED*** })
  })

  it(***REMOVED***marks canonical records loaded without changing another source session***REMOVED***, () => {
    const sourceA = setDiscoveredCandidates(createImportSession(***REMOVED***source-a***REMOVED***), [candidate])
    const sourceB = createImportSession(***REMOVED***source-b***REMOVED***)
    const record = { ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }

    const loadedSourceA = setLoadedRecords(sourceA, [record])

    expect(loadedSourceA.records).toEqual([record])
    expect(loadedSourceA.recordResults[importRecordKey(record)]).toEqual({ stage: ***REMOVED***loaded***REMOVED*** })
    expect(sourceB).toEqual(createImportSession(***REMOVED***source-b***REMOVED***))
  })

  it(***REMOVED***records an actionable failure for one record***REMOVED***, () => {
    const session = setDiscoveredCandidates(createImportSession(***REMOVED***source-a***REMOVED***), [candidate])

    const failed = setImportRecordResult(session, candidate, {
      stage: ***REMOVED***failed***REMOVED***,
      error: ***REMOVED***Remote detail request failed***REMOVED***,
    })

    expect(failed.recordResults[importRecordKey(candidate)]).toEqual({
      stage: ***REMOVED***failed***REMOVED***,
      error: ***REMOVED***Remote detail request failed***REMOVED***,
    })
    expect(failed.records).toBe(session.records)
    expect(failed.validationResults).toBe(session.validationResults)
  })

  it(***REMOVED***clears stale validation when the schema changes***REMOVED***, () => {
    const record = { ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }
    const loaded = setLoadedRecords(createImportSession(***REMOVED***source-a***REMOVED***), [record])
    const validated = setImportValidationResults(loaded, [
      { record, result: { isValid: true, errors: [] } },
    ])

    const changed = setImportSchema(validated, { type: ***REMOVED***object***REMOVED*** })

    expect(changed.schema).toEqual({ type: ***REMOVED***object***REMOVED*** })
    expect(changed.validationResults).toEqual({})
    expect(isValidationComplete(changed)).toBe(false)
  })

  it(***REMOVED***allows only validated records unless invalid records are explicitly included***REMOVED***, () => {
    const validRecord = { ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }
    const invalidRecord = {
      ...validRecord,
      uuid: ***REMOVED***transport-2***REMOVED***,
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***external-2***REMOVED*** },
    }
    const loaded = setLoadedRecords(createImportSession(***REMOVED***source-a***REMOVED***), [validRecord, invalidRecord])
    const validated = setImportValidationResults(loaded, [
      { record: validRecord, result: { isValid: true, errors: [] } },
      { record: invalidRecord, result: { isValid: false, errors: [***REMOVED***Required field missing***REMOVED***] } },
    ])

    expect(isValidationComplete(validated)).toBe(true)
    expect(getImportEligibleRecords(validated)).toEqual([validRecord])
    expect(getImportEligibleRecords({ ...validated, includeInvalidRecords: true })).toEqual([
      validRecord,
      invalidRecord,
    ])
  })

  it(***REMOVED***allows the type step to be skipped only when type, schema, and validation are ready***REMOVED***, () => {
    const record = { ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }
    const loaded = setLoadedRecords(createImportSession(***REMOVED***source-a***REMOVED***), [record])
    const validated = setImportValidationResults(loaded, [
      { record, result: { isValid: true, errors: [] } },
    ])
    const ready = {
      ...validated,
      selectedObjectType: { uuid: ***REMOVED***type-1***REMOVED*** } as never,
      schema: { type: ***REMOVED***object***REMOVED*** as const },
    }

    expect(canSkipImportTypeStep(validated)).toBe(false)
    expect(canSkipImportTypeStep({ ...ready, schema: null })).toBe(false)
    expect(canSkipImportTypeStep(ready)).toBe(true)
  })

  it(***REMOVED***stores reconciliation and allows a conflict action to be changed***REMOVED***, () => {
    const record = { ...candidate, description: ***REMOVED******REMOVED***, attrs: {}, sourceData: candidate.data }
    const reconciliation = {
      record,
      status: ***REMOVED***conflicting***REMOVED*** as const,
      action: ***REMOVED***ignore***REMOVED*** as const,
      existingDocuments: [],
    }
    const reconciled = setImportReconciliations(createImportSession(***REMOVED***source-a***REMOVED***), [reconciliation])

    const changed = setImportConflictAction(reconciled, record, ***REMOVED***merge***REMOVED***)

    expect(changed.reconciliations?.[0].action).toBe(***REMOVED***merge***REMOVED***)
    expect(changed.recordResults[importRecordKey(record)]).toEqual({ stage: ***REMOVED***reconciled***REMOVED*** })
  })
})
