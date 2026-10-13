import { describe, expect, it, vi } from 'vitest'
import {
  createImportAllSourcePlan,
  evaluateImportSourceReadiness,
  collectImportDocumentUuids,
  collectImportAllErrors,
  discoverImportAllSource,
  executePreparedImportAllSource,
  executeImportAllSource,
  fanOutCompositeImportCandidates,
  formatUnmatchedArrayRowsError,
  importAllRecordKey,
  importAllReadinessMessage,
  mergeImportAllExecutionPlan,
  mergeArraySourceRecordsIntoParentRecords,
  progressImportAllSourcePreparation,
  refreshImportAllSourceReconciliation,
  prepareImportAllSource,
  loadCompositeImportRecords,
  summarizeImportAllPlan,
} from './import_all_plan'
import type { ImportAllPlanSource, ImportAllSourcePlan } from './import_all_plan'
import type { IDocument } from '@/types/types'
import type { JSONSchema6 } from 'json-schema'

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

describe('Import workflow readiness', () => {
  const schema = { type: 'object' as const }
  const record = {
    uuid: '1', slug: 'one', label: 'One', data: { value: 1 }, attrs: {},
    description: '', sourceData: {}, provenance: { sourceId: 'source-a', externalId: '1' },
  }
  const readyPlan = (): ImportAllSourcePlan => ({
    ...createImportAllSourcePlan(source()),
    status: 'ready', preparationStatus: 'ready', records: [record],
    validationResults: [{ record, isValid: true, errors: [] }],
    validationContext: { schema, objectTypeUuid: 'type-1', records: [record] },
    reconciliations: [{ record, status: 'new', action: 'create', existingDocuments: [] }],
  })
  const evaluate = (options: Partial<Parameters<typeof evaluateImportSourceReadiness>[0]> = {}) =>
    evaluateImportSourceReadiness({ plan: readyPlan(), schema, objectTypeUuid: 'type-1', canWrite: true, ...options })

  it('advances a clean simplified source and pauses interactive or opted-in reviews', () => {
    expect(evaluate()).toEqual({ status: 'advance', action: 'execute' })
    expect(evaluate({ policy: { mode: 'interactive' } })).toEqual({ status: 'needs-input', step: 'review' })
    expect(evaluate({ optedInReviewSteps: ['mapping'] })).toEqual({ status: 'needs-input', step: 'mapping' })
    expect(evaluate({ policy: { reviewSteps: ['overrides'] } })).toEqual({ status: 'needs-input', step: 'overrides' })
    expect(evaluate({ policy: { mode: 'interactive' }, completedReviewSteps: ['review'] })).toEqual({ status: 'advance', action: 'execute' })
  })

  it('cannot dismiss required inputs by completing optional reviews', () => {
    const policy = { inputs: [{ key: 'enabled', label: 'Enabled', step: 'overrides' as const, required: true }] }
    expect(evaluate({ policy, completedReviewSteps: ['overrides'], inputValues: { enabled: ' ' } }))
      .toEqual({ status: 'needs-input', step: 'overrides', inputKeys: ['enabled'] })
    expect(evaluate({ policy, inputValues: { enabled: false } })).toEqual({ status: 'advance', action: 'execute' })
    expect(evaluate({ policy, inputValues: { enabled: 0 } })).toEqual({ status: 'advance', action: 'execute' })
  })

  it('requires explicit automatic type creation permission and a schema', () => {
    expect(evaluate({ objectTypeUuid: undefined })).toEqual({ status: 'needs-input', step: 'type-schema' })
    expect(evaluate({ objectTypeUuid: undefined, policy: { allowAutomaticTypeCreation: true }, canCreateType: true }))
      .toEqual({ status: 'advance', action: 'create-type' })
    expect(evaluate({ objectTypeUuid: undefined, policy: { allowAutomaticTypeCreation: true } }))
      .toEqual({ status: 'blocked', reason: 'permission' })
    expect(evaluate({
      objectTypeUuid: undefined, policy: { allowAutomaticTypeCreation: true },
      canCreateType: true, optedInReviewSteps: ['type-schema']
    }))
      .toEqual({ status: 'needs-input', step: 'type-schema' })
    expect(evaluate({ schema: undefined })).toEqual({ status: 'needs-input', step: 'type-schema' })
  })

  it('does not authorize writes from preparation without a validator', async () => {
    const configuredSource = source()
    const prepared = await prepareImportAllSource({
      source: configuredSource, plan: createImportAllSourcePlan(configuredSource),
      preloadedRecords: [record], schema, objectTypeUuid: 'type-1', token: '',
      signal: new AbortController().signal, fetchExisting: async () => [],
    })
    expect(prepared.preparationStatus).toBe('ready')
    expect(evaluate({ plan: prepared })).toEqual({ status: 'advance', action: 'validate' })
  })

  it('invalidates validation after schema, type, or record edits', async () => {
    const configuredSource = source()
    const prepared = await prepareImportAllSource({
      source: configuredSource, plan: createImportAllSourcePlan(configuredSource),
      preloadedRecords: [{ ...record, data: { value: 1 } }], schema: { ...schema },
      objectTypeUuid: 'type-1', token: '', signal: new AbortController().signal,
      validator: () => ({ isValid: true, errors: [] }), fetchExisting: async () => [],
    })
    expect(evaluate({ plan: prepared })).toEqual({ status: 'advance', action: 'execute' })
    expect(evaluate({ plan: prepared, schema: { type: 'string' } })).toEqual({ status: 'advance', action: 'validate' })
    expect(evaluate({ plan: prepared, objectTypeUuid: 'type-2' })).toEqual({ status: 'advance', action: 'validate' })
    const data = prepared.records[0].data as { value: number }
    data.value = 2
    expect(evaluate({ plan: prepared })).toEqual({ status: 'advance', action: 'validate' })
  })

  it('requires current reconciliation and explicit conflict decisions', () => {
    expect(evaluate({ plan: { ...readyPlan(), reconciliations: [] } })).toEqual({ status: 'advance', action: 'reconcile' })
    const plan = readyPlan()
    plan.reconciliations[0] = { ...plan.reconciliations[0], status: 'conflicting', action: undefined }
    expect(evaluate({ plan })).toEqual({ status: 'needs-input', step: 'review' })
    expect(evaluate({ plan, policy: { defaultConflictAction: 'ignore' } })).toEqual({ status: 'advance', action: 'execute' })
    expect(evaluate({ plan, policy: { defaultConflictAction: 'overwrite' } })).toEqual({ status: 'needs-input', step: 'review' })
    expect(createImportAllSourcePlan({ ...source(), workflowPolicy: { defaultConflictAction: 'merge' } }).defaultConflictAction).toBe('merge')
    plan.conflictActions[importAllRecordKey(record)] = 'merge'
    expect(evaluate({ plan })).toEqual({ status: 'advance', action: 'execute' })
  })

  it('blocks invalid records, ambiguous matches, dependencies, and missing permissions', () => {
    expect(evaluate({ plan: { ...readyPlan(), validationResults: [{ record, isValid: false, errors: ['Invalid'] }] } }))
      .toEqual({ status: 'blocked', reason: 'invalid-records' })
    expect(evaluate({ plan: { ...readyPlan(), reconciliations: [{ record, status: 'ambiguous', existingDocuments: [] }] } }))
      .toEqual({ status: 'blocked', reason: 'ambiguous-matches' })
    expect(evaluate({ relationshipBlockers: ['Missing parent'] })).toEqual({ status: 'blocked', reason: 'relationships' })
    expect(evaluate({ canWrite: false })).toEqual({ status: 'blocked', reason: 'permission' })
  })

  it('prepares idle work, blocks busy/failed work, and recognizes completed work', () => {
    expect(evaluate({ plan: createImportAllSourcePlan(source()) })).toEqual({ status: 'advance', action: 'prepare' })
    expect(evaluate({ plan: { ...readyPlan(), preparationStatus: 'loading' } })).toEqual({ status: 'blocked', reason: 'busy' })
    expect(evaluate({ plan: { ...readyPlan(), error: 'Load failed' } })).toEqual({ status: 'blocked', reason: 'source-error' })
    expect(evaluate({ plan: { ...readyPlan(), executionResults: [{ recordKey: importAllRecordKey(record), status: 'failed' }] } }))
      .toEqual({ status: 'blocked', reason: 'execution-errors' })
    expect(evaluate({ plan: { ...readyPlan(), executionResults: [{ recordKey: importAllRecordKey(record), status: 'imported' }] } }))
      .toEqual({ status: 'complete' })
    expect(evaluate({ plan: { ...readyPlan(), enabled: false } })).toEqual({ status: 'complete' })
  })
})

describe('Import source preparation progression', () => {
  const schema = { type: 'object' as const }
  const record = {
    uuid: '1', slug: 'one', label: 'One', data: { value: 1 }, attrs: {},
    description: '', sourceData: {}, provenance: { sourceId: 'source-a', externalId: '1' },
  }
  const configuredSource = source()
  const validator = vi.fn(() => ({ isValid: true, errors: [] }))
  const fetchExisting = vi.fn(async () => [] as IDocument[])
  const progress = (options: Partial<Parameters<typeof progressImportAllSourcePreparation>[0]> = {}) =>
    progressImportAllSourcePreparation({
      source: configuredSource,
      plan: createImportAllSourcePlan(configuredSource),
      preloadedRecords: [record],
      schema,
      objectTypeUuid: 'type-1',
      canWrite: true,
      token: '',
      signal: new AbortController().signal,
      validator,
      fetchExisting,
      ...options,
    })

  it('prepares, validates, and reconciles preloaded canonical records in one step', async () => {
    const result = await progress()

    expect(configuredSource.sourceAdapter.load).not.toHaveBeenCalled()
    expect(validator).toHaveBeenCalledWith(schema, record)
    expect(fetchExisting).toHaveBeenCalledWith({
      records: [record], objectTypeUuid: 'type-1', token: '', signal: expect.any(AbortSignal),
    })
    expect(result.plan).toMatchObject({
      preparationStatus: 'ready',
      records: [record],
      validationResults: [{ isValid: true }],
      reconciliations: [{ status: 'new' }],
    })
    expect(result.decision).toMatchObject({
      status: 'paused', reason: 'unsupported-stage', unsupportedAction: 'execute',
    })
  })

  it('loads an unprepared remote source once through existing preparation', async () => {
    const remoteSource = source()
    remoteSource.sourceAdapter.load = vi.fn(async () => record)
    const result = await progress({
      source: remoteSource,
      plan: { ...createImportAllSourcePlan(remoteSource), status: 'ready', candidates: [{ ...record }] },
      preloadedRecords: undefined,
      policy: { mode: 'interactive', allowAutomaticTypeCreation: false },
      canCreateType: false,
    })

    expect(remoteSource.sourceAdapter.load).toHaveBeenCalledTimes(1)
    expect(result.plan.validationContext).toMatchObject({ schema, objectTypeUuid: 'type-1' })
    expect(result.decision).toMatchObject({ reason: 'readiness', readiness: { status: 'needs-input', step: 'review' } })
    expect(result.plan.executionResults).toEqual([])
  })

  it('does not reload preloaded composite members or prepare unauthenticated work', async () => {
    const remoteSource = source()
    remoteSource.sourceAdapter.load = vi.fn(async () => record)
    const ready = await progress({ source: remoteSource })
    expect(ready.plan.records).toEqual([record])
    expect(remoteSource.sourceAdapter.load).not.toHaveBeenCalled()

    const blocked = await progress({ source: remoteSource, preloadedRecords: undefined, canWrite: false })
    expect(blocked.decision).toMatchObject({ readiness: { status: 'blocked', reason: 'permission' } })
    expect(remoteSource.sourceAdapter.load).not.toHaveBeenCalled()
  })

  it('clears old review acknowledgments when a remote reload changes records', async () => {
    const ready = await progress()
    const remoteSource = source()
    const changedRecord = { ...record, data: { value: 2 } }
    remoteSource.sourceAdapter.load = vi.fn(async () => changedRecord)
    const result = await progress({
      source: remoteSource,
      plan: { ...ready.plan, preparationStatus: 'idle', candidates: [{ ...record }] },
      preloadedRecords: undefined,
      policy: { mode: 'interactive' },
      completedReviewSteps: ['mapping', 'review', 'relationships'],
    })

    expect(remoteSource.sourceAdapter.load).toHaveBeenCalledTimes(1)
    expect(result.plan.records).toEqual([changedRecord])
    expect(result.completedReviewSteps).toEqual([])
    expect(result.invalidatedReviewSteps).toContain('review')
    expect(result.decision).toMatchObject({ readiness: { status: 'needs-input', step: 'review' } })
  })

  it('reuses retained remote records when type setup resumes validation', async () => {
    const remoteSource = source()
    remoteSource.sourceAdapter.load = vi.fn(async () => record)
    const loaded = await progress({
      source: remoteSource,
      plan: { ...createImportAllSourcePlan(remoteSource), status: 'ready', candidates: [{ ...record }] },
      preloadedRecords: undefined, objectTypeUuid: undefined, schema: undefined,
    })
    const resumed = await progress({
      source: remoteSource, plan: loaded.plan, preloadedRecords: undefined,
    })

    expect(remoteSource.sourceAdapter.load).toHaveBeenCalledTimes(1)
    expect(resumed.plan.validationContext).toMatchObject({ schema, objectTypeUuid: 'type-1' })
    expect(resumed.plan.reconciliations).toHaveLength(1)
  })

  it('prepares retained records against a newly created schema without loading again', async () => {
    const remoteSource = source()
    const loaded = await progress({
      source: remoteSource,
      objectTypeUuid: undefined,
      schema: undefined,
    })
    const inferredSchema = {
      type: 'object' as const,
      properties: { value: { type: 'number' as const } },
    }
    const validateCreatedType = vi.fn(() => ({ isValid: true, errors: [] }))
    const reconcileCreatedType = vi.fn(async () => [] as IDocument[])
    const prepared = await progress({
      source: remoteSource,
      plan: { ...loaded.plan, preparationStatus: 'idle', error: undefined },
      preloadedRecords: loaded.plan.records,
      objectTypeUuid: 'created-type',
      schema: inferredSchema,
      validator: validateCreatedType,
      fetchExisting: reconcileCreatedType,
      policy: { mode: 'interactive', allowAutomaticTypeCreation: false },
      canCreateType: false,
    })

    expect(remoteSource.sourceAdapter.load).not.toHaveBeenCalled()
    expect(validateCreatedType).toHaveBeenCalledExactlyOnceWith(inferredSchema, record)
    expect(reconcileCreatedType).toHaveBeenCalledWith(expect.objectContaining({
      records: [record], objectTypeUuid: 'created-type',
    }))
    expect(prepared.plan).toMatchObject({
      preparationStatus: 'ready',
      records: [record],
      validationContext: { objectTypeUuid: 'created-type', schema: inferredSchema },
      reconciliations: [{ status: 'new' }],
    })
    expect(prepared.decision).toMatchObject({
      readiness: { status: 'needs-input', step: 'review' },
    })
  })

  it('refreshes validation and reconciliation after record, type, or schema changes', async () => {
    const ready = await progress()
    const editedRecord = { ...record, data: { value: 2 } }
    validator.mockClear()
    fetchExisting.mockClear()
    const edited = await progress({ plan: ready.plan, preloadedRecords: [editedRecord] })

    expect(validator).toHaveBeenCalledWith(schema, editedRecord)
    expect(fetchExisting).toHaveBeenCalledTimes(1)
    expect(edited.plan.validationContext?.records).toEqual([editedRecord])
    expect(edited.invalidatedReviewSteps).toEqual([
      'mapping', 'overrides', 'review', 'relationships',
    ])

    validator.mockClear()
    fetchExisting.mockClear()
    const changedSchema = { type: 'string' as const }
    const changedSetup = await progress({
      plan: ready.plan,
      objectTypeUuid: 'type-2',
      schema: changedSchema,
      completedReviewSteps: ['type-schema', 'review', 'relationships'],
    })
    expect(validator).toHaveBeenCalledWith(changedSchema, record)
    expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({ objectTypeUuid: 'type-2' }))
    expect(changedSetup.plan.validationContext).toMatchObject({
      schema: changedSchema, objectTypeUuid: 'type-2', records: [record],
    })
    expect(changedSetup.invalidatedReviewSteps).toEqual(['type-schema', 'review', 'relationships'])
  })

  it('pauses for required input and missing type/schema setup', async () => {
    fetchExisting.mockClear()
    const policy = {
      inputs: [{ key: 'mapping', label: 'Mapping', step: 'mapping' as const, required: true }],
    }
    const missingInput = await progress({ policy })
    expect(missingInput.decision).toEqual({
      status: 'paused',
      reason: 'readiness',
      readiness: { status: 'needs-input', step: 'mapping', inputKeys: ['mapping'] },
    })
    expect(missingInput.plan.preparationStatus).toBe('idle')
    expect(fetchExisting).not.toHaveBeenCalled()

    const missingSetup = await progress({
      plan: { ...createImportAllSourcePlan(configuredSource), status: 'ready' },
      objectTypeUuid: undefined,
      schema: undefined,
      inputValues: { mapping: 'value' },
      policy,
    })
    expect(missingSetup.plan.preparationStatus).toBe('ready')
    expect(missingSetup.decision).toMatchObject({
      status: 'paused', reason: 'readiness', readiness: { status: 'needs-input', step: 'type-schema' },
    })
  })

  it('revalidates corrected records even when the previous plan was invalid', async () => {
    const ready = await progress()
    const invalidPlan = { ...ready.plan, validationResults: [{ record, isValid: false, errors: ['Invalid'] }] }
    const corrected = { ...record, data: { value: 2 } }
    validator.mockClear()
    fetchExisting.mockClear()

    const result = await progress({ plan: invalidPlan, preloadedRecords: [corrected] })

    expect(validator).toHaveBeenCalledWith(schema, corrected)
    expect(fetchExisting).toHaveBeenCalledTimes(1)
    expect(result.plan.validationResults[0].isValid).toBe(true)
    expect(result.decision).toMatchObject({ reason: 'unsupported-stage', unsupportedAction: 'execute' })
  })

  it('invalidates in-place edits and pauses for renewed opt-in review before validation', async () => {
    const editedRecord = { ...record, data: { value: 1 } }
    const ready = await progress({ preloadedRecords: [editedRecord] })
    editedRecord.data.value = 2
    validator.mockClear()
    fetchExisting.mockClear()

    const result = await progress({
      plan: ready.plan, preloadedRecords: [editedRecord],
      optedInReviewSteps: ['mapping'], completedReviewSteps: ['mapping'],
    })

    expect(result.invalidatedReviewSteps).toContain('mapping')
    expect(result.plan.validationContext).toBeUndefined()
    expect(result.plan.reconciliations).toEqual([])
    expect(result.decision).toMatchObject({ reason: 'readiness', readiness: { status: 'needs-input', step: 'mapping' } })
    expect(validator).not.toHaveBeenCalled()
    expect(fetchExisting).not.toHaveBeenCalled()
  })

  it('does not prepare disabled or completed plans again', async () => {
    const ready = await progress()
    validator.mockClear()
    fetchExisting.mockClear()
    for (const plan of [
      { ...ready.plan, enabled: false },
      { ...ready.plan, executionResults: [{ recordKey: importAllRecordKey(record), status: 'imported' as const }] },
    ]) {
      const result = await progress({ plan })
      expect(result.plan).toBe(plan)
      expect(result.decision).toEqual({ status: 'paused', reason: 'readiness', readiness: { status: 'complete' } })
    }
    expect(validator).not.toHaveBeenCalled()
    expect(fetchExisting).not.toHaveBeenCalled()
  })

  it('pauses unsupported type creation and resumes review without entering writes', async () => {
    const ready = await progress()
    const unsupportedCreate = await progress({
      plan: ready.plan,
      objectTypeUuid: undefined,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
    })
    expect(unsupportedCreate.decision).toMatchObject({
      status: 'paused', reason: 'unsupported-stage', unsupportedAction: 'create-type',
    })

    const reviewSource = source()
    const reviewFetchExisting = vi.fn(async () => [] as IDocument[])
    const reviewArgs = {
      source: reviewSource,
      preloadedRecords: [record],
      policy: { reviewSteps: ['mapping'] as ('mapping')[] },
      objectTypeUuid: 'type-1',
      schema,
      canWrite: true,
      token: '',
      signal: new AbortController().signal,
      validator: () => ({ isValid: true, errors: [] }),
      fetchExisting: reviewFetchExisting,
    }
    const paused = await progressImportAllSourcePreparation({
      ...reviewArgs,
      plan: { ...createImportAllSourcePlan(reviewSource), status: 'ready' },
    })
    expect(paused.decision).toMatchObject({
      status: 'paused', reason: 'readiness', readiness: { status: 'needs-input', step: 'mapping' },
    })
    const resumed = await progressImportAllSourcePreparation({
      ...reviewArgs,
      plan: paused.plan,
      completedReviewSteps: ['mapping'],
    })
    expect(resumed.decision).toMatchObject({
      status: 'paused', reason: 'unsupported-stage', unsupportedAction: 'execute',
    })
    expect(resumed.plan.executionResults).toEqual([])
    expect(reviewFetchExisting).toHaveBeenCalledTimes(1)
  })

  it('gates injected type creation on policy, permission, and type-schema review', async () => {
    const ready = await progress()
    const createTypeIfMissing = vi.fn(async () => ({ objectTypeUuid: 'created-type', schema }))

    const gateOptions: Partial<Parameters<typeof progressImportAllSourcePreparation>[0]>[] = [
      { policy: {}, canCreateType: true },
      { policy: { allowAutomaticTypeCreation: true }, canCreateType: false },
      { policy: { allowAutomaticTypeCreation: true }, canCreateType: true, canWrite: false },
      {
        policy: { allowAutomaticTypeCreation: true, reviewSteps: ['type-schema'] },
        canCreateType: true,
      },
    ]
    for (const options of gateOptions) {
      const result = await progress({
        plan: ready.plan,
        objectTypeUuid: undefined,
        ...options,
        createTypeIfMissing,
      })
      expect(result.decision).toMatchObject({ status: 'paused', reason: 'readiness' })
    }

    expect(createTypeIfMissing).not.toHaveBeenCalled()
  })

  it('creates at most once, preserves pinned schema authority, and resumes with returned state', async () => {
    const pinnedSchema = { type: 'object' as const, required: ['value'] }
    const pinnedSource: ImportAllPlanSource = {
      ...configuredSource,
      sourceAdapter: { ...configuredSource.sourceAdapter, schema: pinnedSchema },
    }
    const preparedPlan = {
      ...createImportAllSourcePlan(pinnedSource),
      status: 'ready' as const,
      preparationStatus: 'ready' as const,
      records: [record],
    }
    const createTypeIfMissing = vi.fn(async () => ({
      objectTypeUuid: 'created-type',
      schema: { type: 'string' as const },
    }))
    validator.mockClear()
    fetchExisting.mockClear()

    const created = await progress({
      source: pinnedSource,
      plan: preparedPlan,
      objectTypeUuid: undefined,
      schema: pinnedSchema,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
      optedInReviewSteps: ['type-schema'],
      completedReviewSteps: ['type-schema', 'review', 'relationships'],
      createTypeIfMissing,
    })

    expect(createTypeIfMissing).toHaveBeenCalledTimes(1)
    expect(createTypeIfMissing).toHaveBeenCalledWith(expect.objectContaining({ schema: pinnedSchema }))
    expect(created.objectTypeUuid).toBe('created-type')
    expect(created.schema).toBe(pinnedSchema)
    expect(created.invalidatedReviewSteps).toEqual(['type-schema', 'review', 'relationships'])
    expect(created.completedReviewSteps).toEqual([])
    expect(created.decision).toMatchObject({
      status: 'paused', reason: 'readiness', readiness: { status: 'needs-input', step: 'type-schema' },
    })
    expect(validator).not.toHaveBeenCalled()
    expect(fetchExisting).not.toHaveBeenCalled()

    const resumed = await progress({
      source: pinnedSource,
      plan: created.plan,
      objectTypeUuid: created.objectTypeUuid,
      schema: created.schema,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
      optedInReviewSteps: ['type-schema'],
      completedReviewSteps: ['type-schema'],
      createTypeIfMissing,
    })
    expect(createTypeIfMissing).toHaveBeenCalledTimes(1)
    expect(validator).toHaveBeenCalledWith(pinnedSchema, record)
    expect(resumed.plan.validationContext).toMatchObject({
      objectTypeUuid: 'created-type', schema: pinnedSchema,
    })

    const inferredSchema: JSONSchema6 = {
      type: 'object', properties: { value: { type: 'string' } },
    }
    const inferredSource = source()
    const inferredPlan = {
      ...createImportAllSourcePlan(inferredSource),
      status: 'ready' as const,
      preparationStatus: 'ready' as const,
      records: [record],
    }
    const inferType = vi.fn(async () => ({ objectTypeUuid: 'inferred-type', schema: inferredSchema }))
    const inferred = await progress({
      source: inferredSource,
      plan: inferredPlan,
      objectTypeUuid: undefined,
      schema: undefined,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
      createTypeIfMissing: inferType,
    })
    expect(inferred.schema).toBe(inferredSchema)
    validator.mockClear()
    await progress({
      source: inferredSource,
      plan: inferred.plan,
      objectTypeUuid: inferred.objectTypeUuid,
      schema: inferred.schema,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
      createTypeIfMissing: inferType,
    })
    expect(inferType).toHaveBeenCalledTimes(1)
    expect(validator).toHaveBeenCalledWith(inferredSchema, record)
  })

  it('preserves the supplied schema over adapter fallback and created defaults', async () => {
    const ready = await progress()
    const selectedSchema = { type: 'object' as const, required: ['value'] }
    const configured = {
      ...configuredSource,
      sourceAdapter: { ...configuredSource.sourceAdapter, schema: { type: 'string' as const } },
    }
    const createTypeIfMissing = vi.fn(async () => ({ objectTypeUuid: 'created-type', schema: { type: 'number' as const } }))
    const result = await progress({
      source: configured, plan: ready.plan, objectTypeUuid: undefined,
      schema: selectedSchema, policy: { allowAutomaticTypeCreation: true },
      canCreateType: true, createTypeIfMissing,
    })

    expect(result.schema).toBe(selectedSchema)
    expect(createTypeIfMissing).toHaveBeenCalledWith(expect.objectContaining({ schema: selectedSchema }))
  })

  it('retains a returned type when cancellation occurs during creation', async () => {
    const ready = await progress()
    const controller = new AbortController()
    const createTypeIfMissing = vi.fn(async () => {
      controller.abort()
      return { objectTypeUuid: 'created-type', schema }
    })
    const cancelled = await progress({
      plan: ready.plan, objectTypeUuid: undefined, policy: { allowAutomaticTypeCreation: true },
      canCreateType: true, createTypeIfMissing, signal: controller.signal,
    })

    expect(cancelled.objectTypeUuid).toBe('created-type')
    expect(cancelled.decision).toEqual({ status: 'paused', reason: 'type-creation', cancelled: true })
    await progress({
      plan: cancelled.plan, objectTypeUuid: cancelled.objectTypeUuid, schema: cancelled.schema,
      policy: { allowAutomaticTypeCreation: true }, canCreateType: true, createTypeIfMissing,
    })
    expect(createTypeIfMissing).toHaveBeenCalledTimes(1)
  })

  it('pauses safely on creation failure or cancellation and never recreates a supplied type', async () => {
    const ready = await progress()
    const createTypeIfMissing = vi.fn()
      .mockRejectedValueOnce(new Error('Creation failed'))
      .mockRejectedValueOnce(new Error('Aborted'))
      .mockResolvedValue({ objectTypeUuid: 'unexpected', schema })
    const creationArgs = {
      plan: ready.plan,
      objectTypeUuid: undefined,
      policy: { allowAutomaticTypeCreation: true },
      canCreateType: true,
      createTypeIfMissing,
    }

    const failed = await progress(creationArgs)
    expect(failed.plan.records).toEqual(ready.plan.records)
    expect(failed.plan.validationContext).toBeUndefined()
    expect(failed.plan.executionResults).toEqual(ready.plan.executionResults)
    expect(failed.decision).toEqual({ status: 'paused', reason: 'type-creation', error: 'Creation failed' })

    const controller = new AbortController()
    controller.abort()
    const cancelled = await progress({ ...creationArgs, signal: controller.signal })
    expect(cancelled.decision).toEqual({ status: 'paused', reason: 'type-creation', cancelled: true })
    expect(createTypeIfMissing).toHaveBeenCalledTimes(1)

    await progress({ ...creationArgs, objectTypeUuid: 'existing-type' })
    expect(createTypeIfMissing).toHaveBeenCalledTimes(1)
  })
})

describe('Prepared import source execution', () => {
  const schema = { type: 'object' as const }
  const record = {
    uuid: '1', slug: 'one', label: 'One', data: { value: 1 }, attrs: {},
    description: '', sourceData: {}, provenance: { sourceId: 'source-a', externalId: '1' },
  }
  const readyPlan = (status: 'new' | 'conflicting' = 'new'): ImportAllSourcePlan => ({
    ...createImportAllSourcePlan(source()),
    status: 'ready',
    preparationStatus: 'ready',
    records: [record],
    validationResults: [{ record, isValid: true, errors: [] }],
    validationContext: { schema, objectTypeUuid: 'type-1', records: [record] },
    reconciliations: [{
      record,
      status,
      action: status === 'new' ? 'create' : undefined,
      existingDocuments: status === 'new' ? [] : [{
        uuid: 'existing-1', object_type_uuid: 'type-1', slug: 'one', label: 'Old',
        description: '', data: {}, attrs: {},
      } as IDocument],
    }],
  })
  const persistence = () => ({
    post: vi.fn().mockResolvedValue({ uuid: 'created-1' } as IDocument),
    patch: vi.fn().mockResolvedValue({} as IDocument),
    mergeRpc: vi.fn().mockResolvedValue({} as IDocument),
    fetchBySlug: vi.fn().mockResolvedValue(undefined),
  })
  const execute = (options: Partial<Parameters<typeof executePreparedImportAllSource>[0]> = {}) => {
    const services = persistence()
    return executePreparedImportAllSource({
      plan: readyPlan(),
      objectTypeUuid: 'type-1',
      schema,
      canWrite: true,
      signal: new AbortController().signal,
      mergeStrategy: 'client-patch',
      persistence: services,
      delayMsBetweenBatches: 0,
      ...options,
    }).then((result) => ({ ...result, services }))
  }

  it('executes a ready source only when readiness authorizes execute', async () => {
    const { plan, decision, services } = await execute()

    expect(decision).toEqual({ status: 'executed', readiness: { status: 'complete' } })
    expect(services.post).toHaveBeenCalledTimes(1)
    expect(plan.executionResults).toMatchObject([{ status: 'imported', documentUuid: 'created-1' }])
  })

  it('pauses blocked sources without writes', async () => {
    const { plan, decision, services } = await execute({ canWrite: false })

    expect(decision).toEqual({
      status: 'paused', reason: 'readiness', readiness: { status: 'blocked', reason: 'permission' },
    })
    expect(plan.executionResults).toEqual([])
    expect(services.post).not.toHaveBeenCalled()
  })

  it.each([
    { policy: { mode: 'interactive' as const } },
    { optedInReviewSteps: ['mapping' as const] },
    { policy: { inputs: [{ key: 'name', label: 'Name', step: 'overrides' as const, required: true }] } },
    { plan: { ...readyPlan(), validationContext: undefined } },
    { plan: { ...readyPlan(), validationResults: [{ record, isValid: false, errors: ['Invalid'] }] } },
    { plan: { ...readyPlan(), reconciliations: [{ record, status: 'ambiguous' as const, existingDocuments: [] }] } },
  ])('does not write when review or record readiness requires intervention: %j', async (options) => {
    const { decision, services } = await execute(options)

    expect(decision.status).toBe('paused')
    expect(services.post).not.toHaveBeenCalled()
    expect(services.patch).not.toHaveBeenCalled()
    expect(services.mergeRpc).not.toHaveBeenCalled()
    expect(services.fetchBySlug).not.toHaveBeenCalled()
  })

  it('reports failed execution as blocked rather than complete', async () => {
    const services = persistence()
    services.post.mockRejectedValue(new Error('Write failed'))
    const { plan, decision } = await execute({ persistence: services })

    expect(plan.executionResults).toMatchObject([{ status: 'failed' }])
    expect(decision).toEqual({ status: 'executed', readiness: { status: 'blocked', reason: 'execution-errors' } })
  })

  it('retains prior results and partial document UUIDs when adopting a returned plan', () => {
    const firstKey = importAllRecordKey(record)
    const retriedRecord = { ...record, slug: 'two', provenance: { ...record.provenance, externalId: '2' } }
    const retriedKey = importAllRecordKey(retriedRecord)
    const current = {
      ...readyPlan(),
      executionResults: [
        { recordKey: firstKey, action: 'create' as const, status: 'imported' as const, documentUuid: 'kept-uuid' },
        { recordKey: retriedKey, status: 'failed' as const, error: 'temporary' },
      ],
    }
    const returned = {
      ...current,
      executionResults: [
        { recordKey: retriedKey, action: 'create' as const, status: 'imported' as const, documentUuid: 'partial-uuid' },
      ],
      executionCompleted: 1,
      executionTotal: 2,
    }

    expect(mergeImportAllExecutionPlan(current, returned).executionResults).toEqual([
      { recordKey: firstKey, action: 'create', status: 'imported', documentUuid: 'kept-uuid' },
      { recordKey: retriedKey, action: 'create', status: 'imported', documentUuid: 'partial-uuid' },
    ])
    expect(mergeImportAllExecutionPlan(current, {
      ...current, executionResults: [{ recordKey: firstKey, status: 'failed', error: 'stale' }],
    }).executionResults[0]).toEqual(current.executionResults[0])
  })

  it('returns complete without writes when resuming an already settled source', async () => {
    const settled = {
      ...readyPlan(),
      executionResults: [{ recordKey: importAllRecordKey(record), status: 'imported' as const, documentUuid: 'kept-uuid' }],
    }
    const result = await execute({ plan: settled })
    expect(result.decision).toEqual({ status: 'paused', reason: 'readiness', readiness: { status: 'complete' } })
    expect(result.plan.executionResults).toEqual(settled.executionResults)
    expect(result.services.post).not.toHaveBeenCalled()
    expect(importAllReadinessMessage(result.decision.readiness)).toBeUndefined()
  })

  it('gives actionable messages for genuine readiness pauses', () => {
    expect(importAllReadinessMessage({ status: 'advance', action: 'validate' })).toContain('Prepare')
    expect(importAllReadinessMessage({ status: 'needs-input', step: 'overrides', inputKeys: ['dataset_id'] })).toContain('dataset_id')
    expect(importAllReadinessMessage({ status: 'blocked', reason: 'ambiguous-matches' })).toContain('ambiguous')
    expect(importAllReadinessMessage({ status: 'blocked', reason: 'execution-errors' })).toContain('Retry')
  })

  it('allows an explicit retry of a failed prepared record without bypassing readiness', async () => {
    const configuredPlan = readyPlan()
    const recordKey = importAllRecordKey(record)
    const { plan: executedPlan, decision, services } = await execute({
      plan: {
        ...configuredPlan,
        executionResults: [{ recordKey, status: 'failed', error: 'temporary' }],
      },
      recordKeys: new Set([recordKey]),
      retryReconciliation: { token: 'token', fetchExisting: vi.fn(async () => []) },
    })

    expect(services.post).toHaveBeenCalledTimes(1)
    expect(executedPlan.executionResults).toMatchObject([{ recordKey, status: 'imported' }])
    expect(decision).toEqual({ status: 'executed', readiness: { status: 'complete' } })
  })

  it('requires reconciliation refresh for retry and honors newly discovered ambiguity', async () => {
    const recordKey = importAllRecordKey(record)
    const plan = { ...readyPlan(), executionResults: [{ recordKey, status: 'failed' as const }] }
    const paused = await execute({ plan, recordKeys: new Set([recordKey]) })
    expect(paused.decision).toMatchObject({ reason: 'unsupported-stage', unsupportedAction: 'reconcile' })
    expect(paused.services.post).not.toHaveBeenCalled()

    const fetchExisting = vi.fn(async () => [
      { uuid: 'existing-1', slug: record.slug, attrs: {} },
      { uuid: 'existing-2', slug: record.slug, attrs: {} },
    ] as IDocument[])
    const ambiguous = await execute({
      plan, recordKeys: new Set([recordKey]), retryReconciliation: { token: 'token', fetchExisting },
    })
    expect(fetchExisting).toHaveBeenCalledTimes(1)
    expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({ records: [record] }))
    expect(ambiguous.decision).toMatchObject({ readiness: { status: 'blocked', reason: 'ambiguous-matches' } })
    expect(ambiguous.services.post).not.toHaveBeenCalled()
    expect(ambiguous.services.patch).not.toHaveBeenCalled()
  })

  it('retains a successful sibling when another in-flight write is aborted', async () => {
    const base = readyPlan()
    const records = [record, { ...record, slug: 'two', provenance: { ...record.provenance, externalId: '2' } },
      { ...record, slug: 'three', provenance: { ...record.provenance, externalId: '3' } }]
    const plan: ImportAllSourcePlan = {
      ...base, records,
      validationContext: { schema, objectTypeUuid: 'type-1', records },
      validationResults: records.map((record) => ({ record, isValid: true, errors: [] })),
      reconciliations: records.map((record) => ({ record, status: 'new', action: 'create', existingDocuments: [] })),
    }
    const controller = new AbortController()
    const services = persistence()
    services.post.mockImplementation(async (document) => {
      if (document.slug === 'two') {
        controller.abort()
        throw new DOMException('Cancelled', 'AbortError')
      }
      return { uuid: 'created-1' } as IDocument
    })
    const cancelled = await execute({ plan, persistence: services, signal: controller.signal, batchSize: 2 })
    expect(cancelled.plan.executionResults).toEqual([
      { recordKey: importAllRecordKey(record), action: 'create', status: 'imported', documentUuid: 'created-1' },
    ])
    expect(cancelled.decision).toMatchObject({ status: 'executed', cancelled: true })
    expect(services.post).toHaveBeenCalledTimes(2)
  })

  it('does not start a write after cancellation during late-conflict lookup', async () => {
    const controller = new AbortController()
    const services = persistence()
    services.fetchBySlug.mockImplementation(async () => { controller.abort(); return undefined })
    const cancelled = await execute({ persistence: services, signal: controller.signal })
    expect(cancelled.decision).toMatchObject({ cancelled: true })
    expect(cancelled.plan.executionResults).toEqual([])
    expect(services.post).not.toHaveBeenCalled()
  })

  it.each([
    ['prepare', createImportAllSourcePlan(source()), undefined, undefined],
    ['create-type', { ...readyPlan(), validationContext: undefined }, undefined, { allowAutomaticTypeCreation: true }],
    ['validate', { ...readyPlan(), validationContext: undefined }, 'type-1', undefined],
    ['reconcile', { ...readyPlan(), reconciliations: [] as ImportAllSourcePlan['reconciliations'] }, 'type-1', undefined],
  ] as const)('pauses unsupported %s stages instead of progressing', async (action, plan, objectTypeUuid, policy) => {
    const { decision, services } = await execute({ plan, objectTypeUuid, policy, canCreateType: true })

    expect(decision).toMatchObject({
      status: 'paused', reason: 'unsupported-stage', unsupportedAction: action,
      readiness: { status: 'advance', action },
    })
    expect(services.post).not.toHaveBeenCalled()
  })

  it('applies the explicit policy conflict default to readiness and execution', async () => {
    const services = persistence()
    const { plan, decision } = await executePreparedImportAllSource({
      plan: readyPlan('conflicting'),
      policy: { defaultConflictAction: 'overwrite' },
      objectTypeUuid: 'type-1',
      schema,
      canWrite: true,
      signal: new AbortController().signal,
      mergeStrategy: 'client-patch',
      persistence: services,
      delayMsBetweenBatches: 0,
    })

    expect(plan.defaultConflictAction).toBe('overwrite')
    expect(decision).toEqual({ status: 'executed', readiness: { status: 'complete' } })
    expect(services.patch).toHaveBeenCalledWith('existing-1', expect.objectContaining({ data: { value: 1 } }), expect.any(AbortSignal))
    expect(plan.executionResults).toMatchObject([{ action: 'overwrite', status: 'imported' }])
  })
})

describe('Import All discovery plan', () => {
  it('fans composite candidates into distinct typed source records without reloading them', async () => {
    const candidate = {
      uuid: 'dataset-1',
      slug: 'dataset-1',
      label: 'Dataset 1',
      partial: true,
      data: { dataset_id: 'dataset-1' },
      provenance: { sourceId: 'composite', externalId: 'dataset-1' },
    }
    const records = {
      dataset: {
        uuid: 'dataset-1',
        slug: 'dataset-1',
        label: 'Dataset 1',
        description: '',
        attrs: {},
        data: { id: 'dataset-1' },
        sourceData: {},
        provenance: { sourceId: 'dataset', externalId: 'dataset-1' },
      },
      variables: {
        uuid: 'dataset-1:variables',
        slug: 'dataset-1',
        label: 'Dataset 1 variables',
        description: '',
        attrs: {},
        data: { dataset_id: 'dataset-1', variables: {} },
        sourceData: {},
        provenance: { sourceId: 'variables', externalId: 'dataset-1' },
      },
    }
    const adapter = {
      id: 'composite',
      memberSourceIds: ['dataset', 'variables'] as [string, string],
      defaultImportUrl: '',
      discover: vi.fn(),
      load: vi.fn().mockResolvedValue(records),
    }
    const memberCandidates = fanOutCompositeImportCandidates([candidate], adapter.memberSourceIds)
    const loaded = await loadCompositeImportRecords({
      adapter,
      candidates: [candidate],
      signal: new AbortController().signal,
    })

    expect(memberCandidates.dataset[0].provenance.sourceId).toBe('dataset')
    expect(memberCandidates.variables[0].provenance.sourceId).toBe('variables')
    expect(adapter.load).toHaveBeenCalledTimes(1)
    expect(loaded).toEqual({ dataset: [records.dataset], variables: [records.variables] })

    const componentSource = source()
    const componentPlan = createImportAllSourcePlan(componentSource)
    const prepared = await prepareImportAllSource({
      source: componentSource,
      plan: { ...componentPlan, candidates: memberCandidates.dataset },
      preloadedRecords: loaded.dataset,
      token: '',
      signal: new AbortController().signal,
      fetchExisting: async () => [],
    })

    expect(componentSource.sourceAdapter.load).not.toHaveBeenCalled()
    expect(prepared.records).toEqual(loaded.dataset)
  })

  it('embeds array source rows into matching parent records', () => {
    const parentRecord = {
      uuid: 'parent-1',
      slug: 'parent-1',
      label: 'Parent 1',
      data: { code: 'P-1' },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'parents', externalId: 'parent-1' },
    }
    const arrayRecord = {
      uuid: 'child-1',
      slug: 'child-1',
      label: 'Child 1',
      data: { parent_code: 'P-1', name: 'Child 1' },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'array-source', externalId: 'child-1' },
    }

    const result = mergeArraySourceRecordsIntoParentRecords({
      parentRecords: [parentRecord],
      arrayRecords: [arrayRecord],
      target: {
        parentSourceKey: 'parents',
        arrayFieldPath: 'children',
        parentMatchField: 'code',
        rowMatchField: 'parent_code',
      },
    })

    expect(result.records[0].data).toEqual({
      code: 'P-1',
      children: [{ parent_code: 'P-1', name: 'Child 1' }],
    })
    expect(result.unmatchedArrayRecords).toEqual([])
  })

  it('falls back to raw source data for array parent matching', () => {
    const parentRecord = {
      uuid: 'parent-1',
      slug: 'parent-1',
      label: 'Parent 1',
      data: { name: 'Parent 1' },
      attrs: {},
      description: '',
      sourceData: { code: ' P-1 ' },
      provenance: { sourceId: 'parents', externalId: 'parent-1' },
    }
    const arrayRecord = {
      uuid: 'child-1',
      slug: 'child-1',
      label: 'Child 1',
      data: { name: 'Child 1' },
      attrs: {},
      description: '',
      sourceData: { parent_code: 'P-1' },
      provenance: { sourceId: 'array-source', externalId: 'child-1' },
    }

    const result = mergeArraySourceRecordsIntoParentRecords({
      parentRecords: [parentRecord],
      arrayRecords: [arrayRecord],
      target: {
        parentSourceKey: 'parents',
        arrayFieldPath: 'children',
        parentMatchField: 'code',
        rowMatchField: 'parent_code',
      },
    })

    expect(result.unmatchedArrayRecords).toEqual([])
    expect(result.records[0].data).toEqual({
      name: 'Parent 1',
      children: [{ name: 'Child 1' }],
    })
  })

  it('returns array rows with missing or unmatched parent keys and formats a diagnostic', () => {
    const parentRecord = {
      uuid: 'parent-1',
      slug: 'parent-1',
      label: 'Parent 1',
      data: { 'station-id': 'ERDDAP-A-001' },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'parents', externalId: 'parent-1' },
    }
    const matchedArrayRecord = {
      uuid: 'header-1',
      slug: 'header-1',
      label: 'Header 1',
      data: { station_identifier: 'ERDDAP-A-001', data_type: 'float' },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'array-source', externalId: 'header-1' },
    }
    const unmatchedArrayRecord = {
      ...matchedArrayRecord,
      uuid: 'header-2',
      slug: 'header-2',
      provenance: { sourceId: 'array-source', externalId: 'header-2' },
      data: { station_identifier: 'UNKNOWN', data_type: 'string' },
    }
    const arrayRecordWithoutParentKey = {
      ...matchedArrayRecord,
      uuid: 'header-3',
      slug: 'header-3',
      provenance: { sourceId: 'array-source', externalId: 'header-3' },
      data: { data_type: 'integer' },
    }

    const result = mergeArraySourceRecordsIntoParentRecords({
      parentRecords: [parentRecord],
      arrayRecords: [matchedArrayRecord, unmatchedArrayRecord, arrayRecordWithoutParentKey],
      target: {
        parentSourceKey: 'parents',
        arrayFieldPath: 'sample_file.headers',
        parentMatchField: 'station-id',
        rowMatchField: 'station_identifier',
      },
    })

    expect(result.records[0].data).toEqual({
      'station-id': 'ERDDAP-A-001',
      sample_file: {
        headers: [{ station_identifier: 'ERDDAP-A-001', data_type: 'float' }],
      },
    })
    expect(result.unmatchedArrayRecords.map(({ provenance }) => provenance.externalId)).toEqual([
      'header-2',
      'header-3',
    ])
    expect(formatUnmatchedArrayRowsError(result.unmatchedArrayRecords.length)).toBe(
      '2 array rows did not match a parent record.'
    )
    expect(formatUnmatchedArrayRowsError(1)).toBe('1 array row did not match a parent record.')
  })

  it('collects relationship document UUIDs from execution results', () => {
    const configuredSource = source()
    const record = {
      uuid: '1',
      slug: 'one',
      label: 'One',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      type: 'children',
      records: [record],
      executionResults: [
        { recordKey: 'source-a:1', status: 'imported' as const, documentUuid: 'document-1' },
      ],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [plan],
      objectTypesBySlug: { children: { uuid: 'child-type', slug: 'children' } },
    })

    expect(documentUuids.get('child-type:source-a:1')).toBe('document-1')
  })

  it('collects existing UUIDs even when execution results are ignored', () => {
    const configuredSource = source()
    const record = {
      uuid: '1',
      slug: 'one',
      label: 'One',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      type: 'children',
      records: [record],
      reconciliations: [
        {
          record,
          status: 'exact' as const,
          action: 'ignore' as const,
          existingDocuments: [{ uuid: 'existing-document-1' } as IDocument],
        },
      ],
      executionResults: [{ recordKey: 'source-a:1', status: 'ignored' as const }],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [plan],
      objectTypesBySlug: { children: { uuid: 'child-type', slug: 'children' } },
    })

    expect(documentUuids.get('child-type:source-a:1')).toBe('existing-document-1')
  })

  it.each([
    ['both documents are new', false, false],
    ['the parent already exists', true, false],
    ['the child already exists', false, true],
    ['both documents already exist', true, true],
  ])('collects UUIDs when %s', (_caseName, parentExists, childExists) => {
    const parentSource = source()
    const childSource = source()
    const parentRecord = {
      uuid: 'parent-1',
      slug: 'parent-1',
      label: 'Parent',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'parent-source', externalId: 'parent-1' },
    }
    const childRecord = {
      uuid: 'child-1',
      slug: 'child-1',
      label: 'Child',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'child-source', externalId: 'child-1' },
    }
    const parentPlan = {
      ...createImportAllSourcePlan({ ...parentSource, type: 'parents' }),
      records: [parentRecord],
      reconciliations: parentExists
        ? [
          {
            record: parentRecord,
            status: 'exact' as const,
            action: 'ignore' as const,
            existingDocuments: [{ uuid: 'existing-parent' } as IDocument],
          },
        ]
        : [],
      executionResults: parentExists
        ? []
        : [
          {
            recordKey: 'parent-source:parent-1',
            status: 'imported' as const,
            documentUuid: 'new-parent',
          },
        ],
    }
    const childPlan = {
      ...createImportAllSourcePlan({ ...childSource, type: 'children' }),
      records: [childRecord],
      reconciliations: childExists
        ? [
          {
            record: childRecord,
            status: 'exact' as const,
            action: 'ignore' as const,
            existingDocuments: [{ uuid: 'existing-child' } as IDocument],
          },
        ]
        : [],
      executionResults: childExists
        ? []
        : [
          {
            recordKey: 'child-source:child-1',
            status: 'imported' as const,
            documentUuid: 'new-child',
          },
        ],
    }

    const documentUuids = collectImportDocumentUuids({
      executedPlans: [childPlan, parentPlan],
      objectTypesBySlug: {
        parents: { uuid: 'parent-type', slug: 'parents' },
        children: { uuid: 'child-type', slug: 'children' },
      },
    })

    expect(documentUuids.get('parent-type:parent-source:parent-1')).toBe(
      parentExists ? 'existing-parent' : 'new-parent'
    )
    expect(documentUuids.get('child-type:child-source:child-1')).toBe(
      childExists ? 'existing-child' : 'new-child'
    )
  })

  it('collects source, validation, document, and relationship errors', () => {
    const configuredSource = source()
    const record = {
      uuid: '1',
      slug: 'one',
      label: 'One',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      label: 'Source A',
      error: 'Source unavailable',
      validationResults: [{ record, isValid: false, errors: ['Missing label'] }],
      executionResults: [
        { recordKey: 'source-a:1', status: 'failed' as const, error: 'Write failed' },
      ],
    }
    const errors = collectImportAllErrors({
      plans: [plan],
      relationshipPlans: [
        {
          child: { record, objectTypeUuid: 'child-type', objectTypeSlug: 'children' },
          predicate: 'belongs_to',
          status: 'missing-parent',
          reason: 'Parent was not found',
        },
      ],
      relationshipResults: [
        {
          relationshipKey: 'child-type:source-a:1:belongs_to',
          status: 'failed',
          error: 'Link failed',
        },
        {
          relationshipKey: 'child-type:source-a:2:belongs_to',
          status: 'unattempted',
          error: 'Link was not attempted because relationship persistence was cancelled.',
        },
      ],
    })

    expect(errors.map(({ scope, message }) => [scope, message])).toEqual([
      ['source', 'Source unavailable'],
      ['validation', 'Missing label'],
      ['document', 'Write failed'],
      ['relationship', 'Parent was not found'],
      ['relationship', 'Link failed'],
      ['relationship', 'Link was not attempted because relationship persistence was cancelled.'],
    ])
  })

  it('discovers through the adapter and applies the review limit', async () => {
    const discover = vi.fn().mockResolvedValue([
      {
        uuid: '1',
        slug: '1',
        label: 'One',
        data: {},
        provenance: { sourceId: 'source-a', externalId: '1' },
      },
      {
        uuid: '2',
        slug: '2',
        label: 'Two',
        data: {},
        provenance: { sourceId: 'source-a', externalId: '2' },
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
    expect(
      summarizeImportAllPlan([
        { ...base, status: 'ready', candidates: [{ uuid: '1' }] as never },
        {
          ...base,
          sourceId: 'b',
          type: 'b',
          enabled: false,
          status: 'ready',
          candidates: [{ uuid: '2' }] as never,
        },
        { ...base, sourceId: 'c', type: 'c', status: 'error', error: 'Failed' },
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
        {
          uuid: '1',
          slug: 'one',
          label: 'One',
          data: { valid: true },
          provenance: { sourceId: 'source-a', externalId: '1' },
        },
        {
          uuid: '2',
          slug: 'two',
          label: 'Two',
          data: { valid: false },
          provenance: { sourceId: 'source-a', externalId: '2' },
        },
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
    expect(fetchExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        records: [expect.objectContaining({ slug: 'one' })],
        objectTypeUuid: 'type-1',
      })
    )
    expect(prepared.reconciliations).toEqual([
      expect.objectContaining({ status: 'new', action: 'create' }),
    ])
  })

  it('executes valid records using defaults and per-record overrides', async () => {
    const configuredSource = source()
    const newRecord = {
      uuid: '1',
      slug: 'new',
      label: 'New',
      data: { value: 1 },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const existingRecord = {
      ...newRecord,
      uuid: '2',
      slug: 'existing',
      label: 'Incoming',
      provenance: { sourceId: 'source-a', externalId: '2' },
    }
    const invalidRecord = {
      ...newRecord,
      uuid: '3',
      slug: 'invalid',
      provenance: { sourceId: 'source-a', externalId: '3' },
    }
    const ambiguousRecord = {
      ...newRecord,
      uuid: '4',
      slug: 'ambiguous',
      provenance: { sourceId: 'source-a', externalId: '4' },
    }
    const existing = {
      uuid: 'existing-uuid',
      object_type_uuid: 'type-1',
      slug: 'existing',
      label: 'Existing',
      description: 'Keep',
      data: { old: true },
      attrs: {},
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
        {
          record: newRecord,
          status: 'new' as const,
          action: 'create' as const,
          existingDocuments: [],
        },
        { record: existingRecord, status: 'conflicting' as const, existingDocuments: [existing] },
        {
          record: invalidRecord,
          status: 'new' as const,
          action: 'create' as const,
          existingDocuments: [],
        },
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
    expect(patch).toHaveBeenCalledWith(
      'existing-uuid',
      expect.objectContaining({ data: { old: true, value: 1 } }),
      expect.any(AbortSignal)
    )
    expect(mergeRpc).not.toHaveBeenCalled()
    expect(fetchBySlug).toHaveBeenCalledWith('new', 'type-1', expect.any(AbortSignal))
    expect(executed.executionResults.map(({ status }) => status)).toEqual([
      'imported',
      'imported',
      'blocked',
      'blocked',
    ])
    expect(executed.executionResults[0].documentUuid).toBe('created-uuid')
  })

  it('records a late create conflict without writing over it', async () => {
    const configuredSource = source()
    const record = {
      uuid: '1',
      slug: 'late',
      label: 'Late',
      data: {},
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const plan = {
      ...createImportAllSourcePlan(configuredSource),
      records: [record],
      validationResults: [{ record, isValid: true, errors: [] }],
      reconciliations: [
        { record, status: 'new' as const, action: 'create' as const, existingDocuments: [] },
      ],
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

  it('retries only explicitly selected failed or unattempted records and retains settled results', async () => {
    const configuredSource = source()
    const records = ['1', '2', '3'].map((externalId) => ({
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
      executionResults: [
        { recordKey: importAllRecordKey(records[0]), status: 'imported' as const, documentUuid: 'kept-uuid' },
        { recordKey: importAllRecordKey(records[1]), status: 'failed' as const, error: 'temporary' },
      ],
    }
    const post = vi.fn().mockResolvedValue({ uuid: 'retried-uuid' } as IDocument)
    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: 'type-1',
      signal: new AbortController().signal,
      mergeStrategy: 'client-patch',
      recordKeys: new Set(records.map(importAllRecordKey)),
      delayMsBetweenBatches: 0,
      persistence: {
        post,
        patch: vi.fn(),
        mergeRpc: vi.fn(),
        fetchBySlug: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(post).toHaveBeenCalledTimes(2)
    expect(post.mock.calls.map(([document]) => document.slug)).toEqual(['record-2', 'record-3'])
    expect(executed.executionResults).toEqual([
      { recordKey: importAllRecordKey(records[0]), status: 'imported', documentUuid: 'kept-uuid' },
      { recordKey: importAllRecordKey(records[1]), status: 'imported', action: 'create', documentUuid: 'retried-uuid' },
      { recordKey: importAllRecordKey(records[2]), status: 'imported', action: 'create', documentUuid: 'retried-uuid' },
    ])
  })

  it('batches document writes and reports progress for each settled record', async () => {
    const configuredSource = source()
    const records = ['1', '2', '3'].map((externalId) => ({
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
    let activeWrites = 0
    let maximumActiveWrites = 0
    const post = vi.fn(async () => {
      activeWrites += 1
      maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites)
      await new Promise((resolve) => setTimeout(resolve, 0))
      activeWrites -= 1
      return { uuid: 'created-uuid' } as IDocument
    })
    const progress: number[] = []

    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: 'type-1',
      signal: new AbortController().signal,
      mergeStrategy: 'client-patch',
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

  it('returns completed results and leaves later batches unattempted when execution is aborted', async () => {
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
    const controller = new AbortController()
    const post = vi.fn(async (document: Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>) => {
      if (document.slug === 'record-1') controller.abort()
      return { uuid: 'created-uuid' } as IDocument
    })

    const executed = await executeImportAllSource({
      plan,
      objectTypeUuid: 'type-1',
      signal: controller.signal,
      mergeStrategy: 'client-patch',
      batchSize: 1,
      delayMsBetweenBatches: 0,
      persistence: {
        post,
        patch: vi.fn(),
        mergeRpc: vi.fn(),
        fetchBySlug: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toEqual(expect.objectContaining({ slug: 'record-1' }))
    expect(executed.executionResults).toMatchObject([{ recordKey: importAllRecordKey(records[0]), status: 'imported' }])
    expect(executed.executionCompleted).toBe(1)
    expect(executed.executionTotal).toBe(2)
  })

  it('refreshes only selected failed or unattempted retry records and retains settled reconciliation', async () => {
    const configuredSource = source()
    const records = ['1', '2', '3'].map((externalId) => ({
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
      executionResults: [
        { recordKey: importAllRecordKey(records[0]), status: 'ignored' as const, documentUuid: 'kept-uuid' },
        { recordKey: importAllRecordKey(records[1]), status: 'failed' as const, error: 'temporary' },
      ],
    }
    const existing = {
      uuid: 'existing-1',
      object_type_uuid: 'type-1',
      slug: 'record-1',
      label: '1',
      description: '',
      data: { value: 'record-1' },
      attrs: {},
    } as IDocument
    const fetchExisting = vi.fn().mockResolvedValue([existing])

    const refreshed = await refreshImportAllSourceReconciliation({
      plan,
      recordKeys: new Set(records.map(importAllRecordKey)),
      objectTypeUuid: 'type-1',
      token: 'token',
      signal: new AbortController().signal,
      fetchExisting,
    })

    expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({ records: [records[1], records[2]] }))
    expect(refreshed.reconciliations[0]).toMatchObject({ status: 'conflicting' })
    expect(refreshed.reconciliations[1]).toMatchObject({
      status: 'new',
      action: 'create',
    })
    expect(refreshed.reconciliations[2]).toMatchObject({
      status: 'new',
      action: 'create',
    })
  })

  it('populates an empty reconciliation plan after a type is created', async () => {
    const configuredSource = source()
    const record = {
      uuid: '1',
      slug: 'record-1',
      label: 'Record 1',
      data: { value: 1 },
      attrs: {},
      description: '',
      sourceData: {},
      provenance: { sourceId: 'source-a', externalId: '1' },
    }
    const plan = { ...createImportAllSourcePlan(configuredSource), records: [record] }

    const refreshed = await refreshImportAllSourceReconciliation({
      plan,
      recordKeys: new Set([importAllRecordKey(record)]),
      objectTypeUuid: 'type-1',
      token: 'token',
      signal: new AbortController().signal,
      fetchExisting: vi.fn().mockResolvedValue([]),
    })

    expect(refreshed.reconciliations).toHaveLength(1)
    expect(refreshed.reconciliations[0]).toMatchObject({
      status: 'new',
      action: 'create',
    })
  })
})
