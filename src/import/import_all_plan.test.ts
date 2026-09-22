import { describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***
import {
  createImportAllSourcePlan,
  collectImportDocumentUuids,
  collectImportAllErrors,
  discoverImportAllSource,
  executeImportAllSource,
  importAllRecordKey,
  refreshImportAllSourceReconciliation,
  prepareImportAllSource,
  summarizeImportAllPlan,
} from ***REMOVED***./import_all_plan***REMOVED***
import type { ImportAllPlanSource } from ***REMOVED***./import_all_plan***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***

const source = (discover = vi.fn().mockResolvedValue([])): ImportAllPlanSource => ({
  type: ***REMOVED***source-a***REMOVED***,
  label: ***REMOVED***Source A***REMOVED***,
  sourceAdapter: {
    id: ***REMOVED***source-a***REMOVED***,
    defaultImportUrl: ***REMOVED***https://example.test/records***REMOVED***,
    discover,
    load: vi.fn(),
  },
})

describe(***REMOVED***Import All discovery plan***REMOVED***, () => {
  it(***REMOVED***collects relationship document UUIDs from execution results***REMOVED***, () => {
    const configuredSource = source()
    const record = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***one***REMOVED***,
      label: ***REMOVED***One***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      type: ***REMOVED***children***REMOVED***,
      records: [record],
      executionResults: [
        { recordKey: ***REMOVED***source-a:1***REMOVED***, status: ***REMOVED***imported***REMOVED*** as const, documentUuid: ***REMOVED***document-1***REMOVED*** },
      ],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [plan],
      objectTypesBySlug: { children: { uuid: ***REMOVED***child-type***REMOVED***, slug: ***REMOVED***children***REMOVED*** } },
    })

    expect(documentUuids.get(***REMOVED***child-type:source-a:1***REMOVED***)).toBe(***REMOVED***document-1***REMOVED***)
  })

  it(***REMOVED***collects existing UUIDs even when execution results are ignored***REMOVED***, () => {
    const configuredSource = source()
    const record = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***one***REMOVED***,
      label: ***REMOVED***One***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      type: ***REMOVED***children***REMOVED***,
      records: [record],
      reconciliations: [
        {
          record,
          status: ***REMOVED***exact***REMOVED*** as const,
          action: ***REMOVED***ignore***REMOVED*** as const,
          existingDocuments: [{ uuid: ***REMOVED***existing-document-1***REMOVED*** } as IDocument],
        },
      ],
      executionResults: [{ recordKey: ***REMOVED***source-a:1***REMOVED***, status: ***REMOVED***ignored***REMOVED*** as const }],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [plan],
      objectTypesBySlug: { children: { uuid: ***REMOVED***child-type***REMOVED***, slug: ***REMOVED***children***REMOVED*** } },
    })

    expect(documentUuids.get(***REMOVED***child-type:source-a:1***REMOVED***)).toBe(***REMOVED***existing-document-1***REMOVED***)
  })

  it.each([
    [***REMOVED***both documents are new***REMOVED***, false, false],
    [***REMOVED***the parent already exists***REMOVED***, true, false],
    [***REMOVED***the child already exists***REMOVED***, false, true],
    [***REMOVED***both documents already exist***REMOVED***, true, true],
  ])(***REMOVED***collects UUIDs when %s***REMOVED***, (_caseName, parentExists, childExists) => {
    const parentSource = source()
    const childSource = source()
    const parentRecord = {
      uuid: ***REMOVED***parent-1***REMOVED***,
      slug: ***REMOVED***parent-1***REMOVED***,
      label: ***REMOVED***Parent***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***parent-source***REMOVED***, externalId: ***REMOVED***parent-1***REMOVED*** },
    }
    const childRecord = {
      uuid: ***REMOVED***child-1***REMOVED***,
      slug: ***REMOVED***child-1***REMOVED***,
      label: ***REMOVED***Child***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***child-source***REMOVED***, externalId: ***REMOVED***child-1***REMOVED*** },
    }
    const parentPlan = {
      ...createImportAllSourcePlan({ ...parentSource, type: ***REMOVED***parents***REMOVED*** }),
      records: [parentRecord],
      reconciliations: parentExists
        ? [
            {
              record: parentRecord,
              status: ***REMOVED***exact***REMOVED*** as const,
              action: ***REMOVED***ignore***REMOVED*** as const,
              existingDocuments: [{ uuid: ***REMOVED***existing-parent***REMOVED*** } as IDocument],
            },
          ]
        : [],
      executionResults: parentExists
        ? []
        : [
            {
              recordKey: ***REMOVED***parent-source:parent-1***REMOVED***,
              status: ***REMOVED***imported***REMOVED*** as const,
              documentUuid: ***REMOVED***new-parent***REMOVED***,
            },
          ],
    }
    const childPlan = {
      ...createImportAllSourcePlan({ ...childSource, type: ***REMOVED***children***REMOVED*** }),
      records: [childRecord],
      reconciliations: childExists
        ? [
            {
              record: childRecord,
              status: ***REMOVED***exact***REMOVED*** as const,
              action: ***REMOVED***ignore***REMOVED*** as const,
              existingDocuments: [{ uuid: ***REMOVED***existing-child***REMOVED*** } as IDocument],
            },
          ]
        : [],
      executionResults: childExists
        ? []
        : [
            {
              recordKey: ***REMOVED***child-source:child-1***REMOVED***,
              status: ***REMOVED***imported***REMOVED*** as const,
              documentUuid: ***REMOVED***new-child***REMOVED***,
            },
          ],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [childPlan, parentPlan],
      objectTypesBySlug: {
        parents: { uuid: ***REMOVED***parent-type***REMOVED***, slug: ***REMOVED***parents***REMOVED*** },
        children: { uuid: ***REMOVED***child-type***REMOVED***, slug: ***REMOVED***children***REMOVED*** },
      },
    })

    expect(documentUuids.get(***REMOVED***parent-type:parent-source:parent-1***REMOVED***)).toBe(
      parentExists ? ***REMOVED***existing-parent***REMOVED*** : ***REMOVED***new-parent***REMOVED***
    )
    expect(documentUuids.get(***REMOVED***child-type:child-source:child-1***REMOVED***)).toBe(
      childExists ? ***REMOVED***existing-child***REMOVED*** : ***REMOVED***new-child***REMOVED***
    )
  })

  it(***REMOVED***collects source, validation, document, and relationship errors***REMOVED***, () => {
    const configuredSource = source()
    const record = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***one***REMOVED***,
      label: ***REMOVED***One***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      label: ***REMOVED***Source A***REMOVED***,
      error: ***REMOVED***Source unavailable***REMOVED***,
      validationResults: [{ record, isValid: false, errors: [***REMOVED***Missing label***REMOVED***] }],
      executionResults: [
        { recordKey: ***REMOVED***source-a:1***REMOVED***, status: ***REMOVED***failed***REMOVED*** as const, error: ***REMOVED***Write failed***REMOVED*** },
      ],
    }
    const errors = collectImportAllErrors({
      plans: [plan],
      relationshipPlans: [
        {
          child: { record, objectTypeUuid: ***REMOVED***child-type***REMOVED***, objectTypeSlug: ***REMOVED***children***REMOVED*** },
          predicate: ***REMOVED***belongs_to***REMOVED***,
          status: ***REMOVED***missing-parent***REMOVED***,
          reason: ***REMOVED***Parent was not found***REMOVED***,
        },
      ],
      relationshipResults: [
        {
          relationshipKey: ***REMOVED***child-type:source-a:1:belongs_to***REMOVED***,
          status: ***REMOVED***failed***REMOVED***,
          error: ***REMOVED***Link failed***REMOVED***,
        },
      ],
    })

    expect(errors.map(({ scope, message }) => [scope, message])).toEqual([
      [***REMOVED***source***REMOVED***, ***REMOVED***Source unavailable***REMOVED***],
      [***REMOVED***validation***REMOVED***, ***REMOVED***Missing label***REMOVED***],
      [***REMOVED***document***REMOVED***, ***REMOVED***Write failed***REMOVED***],
      [***REMOVED***relationship***REMOVED***, ***REMOVED***Parent was not found***REMOVED***],
      [***REMOVED***relationship***REMOVED***, ***REMOVED***Link failed***REMOVED***],
    ])
  })

  it(***REMOVED***discovers through the adapter and applies the review limit***REMOVED***, async () => {
    const discover = vi.fn().mockResolvedValue([
      {
        uuid: ***REMOVED***1***REMOVED***,
        slug: ***REMOVED***1***REMOVED***,
        label: ***REMOVED***One***REMOVED***,
        data: {},
        provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
      },
      {
        uuid: ***REMOVED***2***REMOVED***,
        slug: ***REMOVED***2***REMOVED***,
        label: ***REMOVED***Two***REMOVED***,
        data: {},
        provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***2***REMOVED*** },
      },
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
      url: ***REMOVED***https://example.test/records***REMOVED***,
      signal: expect.any(AbortSignal),
    })
    expect(discovered.status).toBe(***REMOVED***ready***REMOVED***)
    expect(discovered.candidates).toHaveLength(1)
  })

  it(***REMOVED***keeps source failures in the review plan***REMOVED***, async () => {
    const configuredSource = source(vi.fn().mockRejectedValue(new Error(***REMOVED***Source unavailable***REMOVED***)))

    const discovered = await discoverImportAllSource({
      source: configuredSource,
      plan: createImportAllSourcePlan(configuredSource),
      signal: new AbortController().signal,
    })

    expect(discovered).toMatchObject({
      status: ***REMOVED***error***REMOVED***,
      candidates: [],
      error: ***REMOVED***Source unavailable***REMOVED***,
    })
  })

  it(***REMOVED***summarizes only enabled ready sources***REMOVED***, () => {
    const base = createImportAllSourcePlan(source())
    expect(
      summarizeImportAllPlan([
        { ...base, status: ***REMOVED***ready***REMOVED***, candidates: [{ uuid: ***REMOVED***1***REMOVED*** }] as never },
        {
          ...base,
          sourceId: ***REMOVED***b***REMOVED***,
          type: ***REMOVED***b***REMOVED***,
          enabled: false,
          status: ***REMOVED***ready***REMOVED***,
          candidates: [{ uuid: ***REMOVED***2***REMOVED*** }] as never,
        },
        { ...base, sourceId: ***REMOVED***c***REMOVED***, type: ***REMOVED***c***REMOVED***, status: ***REMOVED***error***REMOVED***, error: ***REMOVED***Failed***REMOVED*** },
      ])
    ).toEqual({
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

  it(***REMOVED***loads, validates, and reconciles valid records while retaining invalid results***REMOVED***, async () => {
    const load = vi.fn(async ({ candidate }) => ({
      ...candidate,
      description: ***REMOVED******REMOVED***,
      attrs: {},
      sourceData: candidate.data,
    }))
    const configuredSource = source()
    configuredSource.sourceAdapter.load = load
    const discovered = {
      ...createImportAllSourcePlan(configuredSource),
      status: ***REMOVED***ready***REMOVED*** as const,
      candidates: [
        {
          uuid: ***REMOVED***1***REMOVED***,
          slug: ***REMOVED***one***REMOVED***,
          label: ***REMOVED***One***REMOVED***,
          data: { valid: true },
          provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
        },
        {
          uuid: ***REMOVED***2***REMOVED***,
          slug: ***REMOVED***two***REMOVED***,
          label: ***REMOVED***Two***REMOVED***,
          data: { valid: false },
          provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***2***REMOVED*** },
        },
      ],
    }
    const fetchExisting = vi.fn().mockResolvedValue([])

    const prepared = await prepareImportAllSource({
      source: configuredSource,
      plan: discovered,
      schema: { type: ***REMOVED***object***REMOVED*** },
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      token: ***REMOVED***token***REMOVED***,
      signal: new AbortController().signal,
      validator: (_schema, record) => ({
        isValid: (record.data as { valid: boolean }).valid,
        errors: (record.data as { valid: boolean }).valid ? [] : [***REMOVED***Invalid record***REMOVED***],
      }),
      fetchExisting,
    })

    expect(load).toHaveBeenCalledTimes(2)
    expect(prepared.preparationStatus).toBe(***REMOVED***ready***REMOVED***)
    expect(prepared.records).toHaveLength(2)
    expect(prepared.validationResults.map(({ isValid }) => isValid)).toEqual([true, false])
    expect(fetchExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        records: [expect.objectContaining({ slug: ***REMOVED***one***REMOVED*** })],
        objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      })
    )
    expect(prepared.reconciliations).toEqual([
      expect.objectContaining({ status: ***REMOVED***new***REMOVED***, action: ***REMOVED***create***REMOVED*** }),
    ])
  })

  it(***REMOVED***executes valid records using defaults and per-record overrides***REMOVED***, async () => {
    const configuredSource = source()
    const newRecord = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***new***REMOVED***,
      label: ***REMOVED***New***REMOVED***,
      data: { value: 1 },
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const existingRecord = {
      ...newRecord,
      uuid: ***REMOVED***2***REMOVED***,
      slug: ***REMOVED***existing***REMOVED***,
      label: ***REMOVED***Incoming***REMOVED***,
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***2***REMOVED*** },
    }
    const invalidRecord = {
      ...newRecord,
      uuid: ***REMOVED***3***REMOVED***,
      slug: ***REMOVED***invalid***REMOVED***,
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***3***REMOVED*** },
    }
    const ambiguousRecord = {
      ...newRecord,
      uuid: ***REMOVED***4***REMOVED***,
      slug: ***REMOVED***ambiguous***REMOVED***,
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***4***REMOVED*** },
    }
    const existing = {
      uuid: ***REMOVED***existing-uuid***REMOVED***,
      object_type_uuid: ***REMOVED***type-1***REMOVED***,
      slug: ***REMOVED***existing***REMOVED***,
      label: ***REMOVED***Existing***REMOVED***,
      description: ***REMOVED***Keep***REMOVED***,
      data: { old: true },
      attrs: {},
    } as IDocument
    const post = vi.fn().mockResolvedValue({ uuid: ***REMOVED***created-uuid***REMOVED*** })
    const patch = vi.fn().mockResolvedValue({})
    const mergeRpc = vi.fn().mockResolvedValue({})
    const fetchBySlug = vi.fn().mockResolvedValue(undefined)
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records: [newRecord, existingRecord, invalidRecord, ambiguousRecord],
      validationResults: [
        { record: newRecord, isValid: true, errors: [] },
        { record: existingRecord, isValid: true, errors: [] },
        { record: invalidRecord, isValid: false, errors: [***REMOVED***bad***REMOVED***] },
        { record: ambiguousRecord, isValid: true, errors: [] },
      ],
      reconciliations: [
        {
          record: newRecord,
          status: ***REMOVED***new***REMOVED*** as const,
          action: ***REMOVED***create***REMOVED*** as const,
          existingDocuments: [],
        },
        { record: existingRecord, status: ***REMOVED***conflicting***REMOVED*** as const, existingDocuments: [existing] },
        {
          record: invalidRecord,
          status: ***REMOVED***new***REMOVED*** as const,
          action: ***REMOVED***create***REMOVED*** as const,
          existingDocuments: [],
        },
        { record: ambiguousRecord, status: ***REMOVED***ambiguous***REMOVED*** as const, existingDocuments: [existing] },
      ],
      defaultConflictAction: ***REMOVED***ignore***REMOVED*** as const,
      conflictActions: { [importAllRecordKey(existingRecord)]: ***REMOVED***merge***REMOVED*** as const },
    }

    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      signal: new AbortController().signal,
      mergeStrategy: ***REMOVED***client-patch***REMOVED***,
      persistence: { post, patch, mergeRpc, fetchBySlug },
    })

    expect(post).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith(
      ***REMOVED***existing-uuid***REMOVED***,
      expect.objectContaining({ data: { old: true, value: 1 } }),
      expect.any(AbortSignal)
    )
    expect(mergeRpc).not.toHaveBeenCalled()
    expect(fetchBySlug).toHaveBeenCalledWith(***REMOVED***new***REMOVED***, ***REMOVED***type-1***REMOVED***, expect.any(AbortSignal))
    expect(executed.executionResults.map(({ status }) => status)).toEqual([
      ***REMOVED***imported***REMOVED***,
      ***REMOVED***imported***REMOVED***,
      ***REMOVED***blocked***REMOVED***,
      ***REMOVED***blocked***REMOVED***,
    ])
    expect(executed.executionResults[0].documentUuid).toBe(***REMOVED***created-uuid***REMOVED***)
  })

  it(***REMOVED***records a late create conflict without writing over it***REMOVED***, async () => {
    const configuredSource = source()
    const record = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***late***REMOVED***,
      label: ***REMOVED***Late***REMOVED***,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records: [record],
      validationResults: [{ record, isValid: true, errors: [] }],
      reconciliations: [
        { record, status: ***REMOVED***new***REMOVED*** as const, action: ***REMOVED***create***REMOVED*** as const, existingDocuments: [] },
      ],
    }
    const post = vi.fn()
    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      signal: new AbortController().signal,
      mergeStrategy: ***REMOVED***client-patch***REMOVED***,
      persistence: {
        post,
        patch: vi.fn(),
        mergeRpc: vi.fn(),
        fetchBySlug: vi.fn().mockResolvedValue({ uuid: ***REMOVED***already-there***REMOVED*** }),
      },
    })

    expect(post).not.toHaveBeenCalled()
    expect(executed.executionResults[0]).toMatchObject({ status: ***REMOVED***failed***REMOVED***, action: ***REMOVED***create***REMOVED*** })
  })

  it(***REMOVED***executes only selected record keys for retry***REMOVED***, async () => {
    const configuredSource = source()
    const records = [***REMOVED***1***REMOVED***, ***REMOVED***2***REMOVED***].map((externalId) => ({
      uuid: externalId,
      slug: `record-${externalId}`,
      label: externalId,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId },
    }))
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records,
      validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
      reconciliations: records.map((record) => ({
        record,
        status: ***REMOVED***new***REMOVED*** as const,
        action: ***REMOVED***create***REMOVED*** as const,
        existingDocuments: [],
      })),
    }
    const post = vi.fn().mockResolvedValue({})
    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      signal: new AbortController().signal,
      mergeStrategy: ***REMOVED***client-patch***REMOVED***,
      recordKeys: new Set([importAllRecordKey(records[1])]),
      persistence: {
        post,
        patch: vi.fn(),
        mergeRpc: vi.fn(),
        fetchBySlug: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toEqual(expect.objectContaining({ slug: ***REMOVED***record-2***REMOVED*** }))
    expect(executed.executionResults).toHaveLength(1)
    expect(executed.executionResults[0].recordKey).toBe(importAllRecordKey(records[1]))
  })

  it(***REMOVED***batches document writes and reports progress for each settled record***REMOVED***, async () => {
    const configuredSource = source()
    const records = [***REMOVED***1***REMOVED***, ***REMOVED***2***REMOVED***, ***REMOVED***3***REMOVED***].map((externalId) => ({
      uuid: externalId,
      slug: `record-${externalId}`,
      label: externalId,
      data: {},
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId },
    }))
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records,
      validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
      reconciliations: records.map((record) => ({
        record,
        status: ***REMOVED***new***REMOVED*** as const,
        action: ***REMOVED***create***REMOVED*** as const,
        existingDocuments: [],
      })),
    }
    let activeWrites = 0
    let maximumActiveWrites = 0
    const post = vi.fn(async () => {
      activeWrites += 1
      maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites)
      await new Promise((resolve) => setTimeout(resolve, 0))
      activeWrites -= 1
      return { uuid: ***REMOVED***created-uuid***REMOVED*** } as IDocument
    })
    const progress: number[] = []

    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      signal: new AbortController().signal,
      mergeStrategy: ***REMOVED***client-patch***REMOVED***,
      batchSize: 2,
      delayMsBetweenBatches: 0,
      onProgress: (completed) => progress.push(completed),
      persistence: {
        post,
        patch: vi.fn(),
        mergeRpc: vi.fn(),
        fetchBySlug: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(maximumActiveWrites).toBe(2)
    expect(post).toHaveBeenCalledTimes(3)
    expect(progress).toEqual([1, 2, 3])
    expect(executed).toMatchObject({ executionCompleted: 3, executionTotal: 3 })
  })

  it(***REMOVED***refreshes reconciliation only for selected retry records***REMOVED***, async () => {
    const configuredSource = source()
    const records = [***REMOVED***1***REMOVED***, ***REMOVED***2***REMOVED***].map((externalId) => ({
      uuid: externalId,
      slug: `record-${externalId}`,
      label: externalId,
      data: { value: externalId },
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId },
    }))
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records,
      validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
      reconciliations: records.map((record) => ({
        record,
        status: ***REMOVED***conflicting***REMOVED*** as const,
        action: ***REMOVED***overwrite***REMOVED*** as const,
        existingDocuments: [],
      })),
    }
    const existing = {
      uuid: ***REMOVED***existing-1***REMOVED***,
      object_type_uuid: ***REMOVED***type-1***REMOVED***,
      slug: ***REMOVED***record-1***REMOVED***,
      label: ***REMOVED***1***REMOVED***,
      description: ***REMOVED******REMOVED***,
      data: { value: ***REMOVED***record-1***REMOVED*** },
      attrs: {},
    } as IDocument
    const fetchExisting = vi.fn().mockResolvedValue([existing])

    const refreshed = await refreshImportAllSourceReconciliation({
      plan,
      recordKeys: new Set([importAllRecordKey(records[0])]),
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      token: ***REMOVED***token***REMOVED***,
      signal: new AbortController().signal,
      fetchExisting,
    })

    expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({ records: [records[0]] }))
    expect(refreshed.reconciliations[0]).toMatchObject({ status: ***REMOVED***conflicting***REMOVED*** })
    expect(refreshed.reconciliations[1]).toMatchObject({
      status: ***REMOVED***conflicting***REMOVED***,
      action: ***REMOVED***overwrite***REMOVED***,
    })
  })

  it(***REMOVED***populates an empty reconciliation plan after a type is created***REMOVED***, async () => {
    const configuredSource = source()
    const record = {
      uuid: ***REMOVED***1***REMOVED***,
      slug: ***REMOVED***record-1***REMOVED***,
      label: ***REMOVED***Record 1***REMOVED***,
      data: { value: 1 },
      attrs: {},
      description: ***REMOVED******REMOVED***,
      sourceData: {},
      provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** },
    }
    const plan = { ...createImportAllSourcePlan(configuredSource), records: [record] }

    const refreshed = await refreshImportAllSourceReconciliation({
      plan,
      recordKeys: new Set([importAllRecordKey(record)]),
      objectTypeUuid: ***REMOVED***type-1***REMOVED***,
      token: ***REMOVED***token***REMOVED***,
      signal: new AbortController().signal,
      fetchExisting: vi.fn().mockResolvedValue([]),
    })

    expect(refreshed.reconciliations).toHaveLength(1)
    expect(refreshed.reconciliations[0]).toMatchObject({
      status: ***REMOVED***new***REMOVED***,
      action: ***REMOVED***create***REMOVED***,
    })
  })
})
