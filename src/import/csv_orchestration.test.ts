import { describe, expect, it } from 'vitest'
import {
  getCSVDocumentSources,
  mergeCSVArraySources,
  type CSVLoadedSource,
} from './csv_orchestration'
import type { CanonicalImportRecord } from './types'

const record = ({
  sourceId,
  externalId,
  data,
}: {
  sourceId: string
  externalId: string
  data: Record<string, unknown>
}): CanonicalImportRecord => ({
  uuid: externalId,
  slug: externalId,
  label: externalId,
  description: '',
  data,
  attrs: {},
  sourceData: {},
  provenance: { sourceId, externalId },
})

const loadedSource = (
  source: CSVLoadedSource['source'],
  records: CanonicalImportRecord[]
): CSVLoadedSource => ({ source, candidates: [], records })

describe('CSV import orchestration', () => {
  it('merges configured array uploads into the parent document', () => {
    const parentSource = { sourceId: 'configured-parent' }
    const arraySource = {
      sourceId: 'configured-array',
      arrayTarget: {
        parentSourceKey: 'configured-parent',
        arrayFieldPath: 'contacts',
        parentMatchField: 'code',
        rowMatchField: 'parent_code',
      },
    }

    const records = mergeCSVArraySources({
      parentSourceId: parentSource.sourceId,
      loadedSources: [
        loadedSource(parentSource, [
          record({
            sourceId: parentSource.sourceId,
            externalId: 'parent-1',
            data: { code: 'P-1' },
          }),
        ]),
        loadedSource(arraySource, [
          record({
            sourceId: arraySource.sourceId,
            externalId: 'contact-1',
            data: { parent_code: 'P-1', name: 'Ada' },
          }),
        ]),
      ],
    })

    expect(records[0].data).toEqual({
      code: 'P-1',
      contacts: [{ parent_code: 'P-1', name: 'Ada' }],
    })
  })

  it('merges a generic array source without creating a standalone document source', () => {
    const parentSource = { sourceId: 'parent-upload' }
    const arraySource = {
      sourceId: 'generic-array-upload',
      arrayTarget: {
        parentSourceKey: 'parent-upload',
        arrayFieldPath: 'items',
        parentMatchField: 'id',
        rowMatchField: 'parent_id',
      },
    }

    const documentSources = getCSVDocumentSources([parentSource, arraySource])
    const records = mergeCSVArraySources({
      parentSourceId: parentSource.sourceId,
      loadedSources: [
        loadedSource(parentSource, [
          record({ sourceId: parentSource.sourceId, externalId: 'parent-1', data: { id: 7 } }),
        ]),
        loadedSource(arraySource, [
          record({ sourceId: arraySource.sourceId, externalId: 'item-1', data: { parent_id: 7 } }),
        ]),
      ],
    })

    expect(documentSources.map(({ sourceId }) => sourceId)).toEqual(['parent-upload'])
    expect(records[0].data).toEqual({ id: 7, items: [{ parent_id: 7 }] })
  })

  it('blocks the import when an array row has no matching parent', () => {
    const parentSource = { sourceId: 'parent-upload' }
    const arraySource = {
      sourceId: 'array-upload',
      arrayTarget: {
        parentSourceKey: 'parent-upload',
        arrayFieldPath: 'items',
        parentMatchField: 'id',
        rowMatchField: 'parent_id',
      },
    }

    expect(() =>
      mergeCSVArraySources({
        parentSourceId: parentSource.sourceId,
        loadedSources: [
          loadedSource(parentSource, [
            record({ sourceId: parentSource.sourceId, externalId: 'parent-1', data: { id: 7 } }),
          ]),
          loadedSource(arraySource, [
            record({
              sourceId: arraySource.sourceId,
              externalId: 'item-1',
              data: { parent_id: 8 },
            }),
          ]),
        ],
      })
    ).toThrow('1 array row did not match a parent record.')
  })
})
