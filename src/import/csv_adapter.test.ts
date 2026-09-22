import { describe, expect, it } from ***REMOVED***vitest***REMOVED***
import {
  createCSVImportAdapter,
  inferCSVImportMapping,
  csvFileNameToTypeLabel,
  csvFileNameToTypeSlug,
} from ***REMOVED***./csv_adapter***REMOVED***

describe(***REMOVED***createCSVImportAdapter***REMOVED***, () => {
  it(***REMOVED***infers special fields and leaves remaining columns as document data***REMOVED***, () => {
    expect(inferCSVImportMapping([***REMOVED***external_id***REMOVED***, ***REMOVED***name***REMOVED***, ***REMOVED***description***REMOVED***, ***REMOVED***category***REMOVED***])).toEqual({
      label: ***REMOVED***name***REMOVED***,
      slug: undefined,
      externalId: ***REMOVED***external_id***REMOVED***,
      description: ***REMOVED***description***REMOVED***,
      dataColumns: [***REMOVED***category***REMOVED***],
    })
  })

  it(***REMOVED***derives readable type and schema names from a filename***REMOVED***, () => {
    expect(csvFileNameToTypeSlug(***REMOVED***Test Metadata 2026.csv***REMOVED***)).toBe(***REMOVED***test_metadata_2026***REMOVED***)
    expect(csvFileNameToTypeLabel(***REMOVED***Test Metadata 2026.csv***REMOVED***)).toBe(***REMOVED***Test Metadata 2026***REMOVED***)
    expect(csvFileNameToTypeSlug(***REMOVED***.csv***REMOVED***)).toBe(***REMOVED***csv-import***REMOVED***)
  })

  it(***REMOVED***discovers rows with stable provenance and loads canonical records***REMOVED***, async () => {
    const adapter = createCSVImportAdapter({
      id: ***REMOVED***csv-assets***REMOVED***,
      text: ***REMOVED***id,name,kind\nasset-1,Asset One,photo\nasset-2,Asset Two,video***REMOVED***,
      mapping: { externalId: ***REMOVED***id***REMOVED***, label: ***REMOVED***name***REMOVED***, slug: ***REMOVED***id***REMOVED***, dataColumns: [***REMOVED***kind***REMOVED***] },
    })

    const candidates = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })
    const record = await adapter.load({ candidate: candidates[0] })

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      uuid: ***REMOVED***asset-1***REMOVED***,
      label: ***REMOVED***Asset One***REMOVED***,
      slug: ***REMOVED***asset-1***REMOVED***,
      data: { id: ***REMOVED***asset-1***REMOVED***, name: ***REMOVED***Asset One***REMOVED***, kind: ***REMOVED***photo***REMOVED*** },
      provenance: { sourceId: ***REMOVED***csv-assets***REMOVED***, externalId: ***REMOVED***asset-1***REMOVED*** },
    })
    expect(record).toMatchObject({
      uuid: ***REMOVED***asset-1***REMOVED***,
      label: ***REMOVED***Asset One***REMOVED***,
      slug: ***REMOVED***asset-1***REMOVED***,
      data: { kind: ***REMOVED***photo***REMOVED*** },
      sourceData: candidates[0].data,
      provenance: candidates[0].provenance,
    })
  })

  it(***REMOVED***falls back to row identity and a readable label and slug***REMOVED***, async () => {
    const adapter = createCSVImportAdapter({
      id: ***REMOVED***csv-items***REMOVED***,
      text: ***REMOVED***title,value\nA useful item,3\n,4***REMOVED***,
    })
    const candidates = await adapter.discover({
      url: adapter.defaultImportUrl,
      signal: new AbortController().signal,
    })

    expect(candidates.map(({ uuid, label, slug }) => ({ uuid, label, slug }))).toEqual([
      { uuid: ***REMOVED***1***REMOVED***, label: ***REMOVED***Row 1***REMOVED***, slug: ***REMOVED***row-1***REMOVED*** },
      { uuid: ***REMOVED***2***REMOVED***, label: ***REMOVED***Row 2***REMOVED***, slug: ***REMOVED***row-2***REMOVED*** },
    ])
  })
})
