import { describe, expect, it, vi } from ***REMOVED***vitest***REMOVED***
import {
    createImportAllSourcePlan,
    discoverImportAllSource,
    prepareImportAllSource,
    summarizeImportAllPlan,
} from ***REMOVED***./import_all_plan***REMOVED***
import type { ImportAllPlanSource } from ***REMOVED***./import_all_plan***REMOVED***

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
    it(***REMOVED***discovers through the adapter and applies the review limit***REMOVED***, async () => {
        const discover = vi.fn().mockResolvedValue([
            { uuid: ***REMOVED***1***REMOVED***, slug: ***REMOVED***1***REMOVED***, label: ***REMOVED***One***REMOVED***, data: {}, provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** } },
            { uuid: ***REMOVED***2***REMOVED***, slug: ***REMOVED***2***REMOVED***, label: ***REMOVED***Two***REMOVED***, data: {}, provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***2***REMOVED*** } },
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
        expect(summarizeImportAllPlan([
            { ...base, status: ***REMOVED***ready***REMOVED***, candidates: [{ uuid: ***REMOVED***1***REMOVED*** }] as never },
            { ...base, sourceId: ***REMOVED***b***REMOVED***, type: ***REMOVED***b***REMOVED***, enabled: false, status: ***REMOVED***ready***REMOVED***, candidates: [{ uuid: ***REMOVED***2***REMOVED*** }] as never },
            { ...base, sourceId: ***REMOVED***c***REMOVED***, type: ***REMOVED***c***REMOVED***, status: ***REMOVED***error***REMOVED***, error: ***REMOVED***Failed***REMOVED*** },
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
                { uuid: ***REMOVED***1***REMOVED***, slug: ***REMOVED***one***REMOVED***, label: ***REMOVED***One***REMOVED***, data: { valid: true }, provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***1***REMOVED*** } },
                { uuid: ***REMOVED***2***REMOVED***, slug: ***REMOVED***two***REMOVED***, label: ***REMOVED***Two***REMOVED***, data: { valid: false }, provenance: { sourceId: ***REMOVED***source-a***REMOVED***, externalId: ***REMOVED***2***REMOVED*** } },
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
        expect(fetchExisting).toHaveBeenCalledWith(expect.objectContaining({
            records: [expect.objectContaining({ slug: ***REMOVED***one***REMOVED*** })],
            objectTypeUuid: ***REMOVED***type-1***REMOVED***,
        }))
        expect(prepared.reconciliations).toEqual([
            expect.objectContaining({ status: ***REMOVED***new***REMOVED***, action: ***REMOVED***create***REMOVED*** }),
        ])
    })
})