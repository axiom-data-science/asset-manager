import { describe, expect, it } from 'vitest'
import {
  formatCSVRecordsError,
  getCSVDocumentSources,
  getCSVDocumentSourcesInDependencyOrder,
  getCSVSourceDependencies,
  getCSVSourceExecutionDependencies,
  mergeCSVArraySources,
  type CSVLoadedSource,
} from './csv_orchestration'
import type { CanonicalImportRecord } from './types'

const record = ({
  sourceId,
  externalId,
  data,
  sourceData = {},
}: {
  sourceId: string
  externalId: string
  data: Record<string, unknown>
  sourceData?: Record<string, unknown>
}): CanonicalImportRecord => ({
  uuid: externalId,
  slug: externalId,
  label: externalId,
  description: '',
  data,
  attrs: {},
  sourceData,
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

  it('merges array rows into their configured parent source instead of the generic parent', () => {
    const loadedSources = [
      loadedSource(
        { sourceId: 'project-upload', sourceKey: 'pam-project' },
        [record({ sourceId: 'project-upload', externalId: 'project-1', data: { project: 'Project' } })]
      ),
      loadedSource(
        { sourceId: 'deployment-upload', sourceKey: 'pam-deployment' },
        [
          record({
            sourceId: 'deployment-upload',
            externalId: 'deployment-1',
            data: { deploymentTitle: 'Example PAM Deployment' },
            sourceData: { deploymentTitle: 'Example PAM Deployment' },
          }),
        ]
      ),
      loadedSource(
        {
          sourceId: 'recordings-upload',
          sourceKey: 'pam-recordings',
          fileName: 'pam_recordings.csv',
          arrayTarget: {
            parentSourceKey: 'pam-deployment',
            arrayFieldPath: 'recordings',
            parentMatchField: 'deploymentTitle',
            rowMatchField: 'deploymentTitle',
          },
        },
        [
          record({
            sourceId: 'recordings-upload',
            externalId: 'recording-1',
            data: { deploymentTitle: 'Example PAM Deployment', channels: [{ sampleRate: 48000 }] },
            sourceData: { deploymentTitle: 'Example PAM Deployment' },
          }),
        ]
      ),
      loadedSource(
        {
          sourceId: 'analyses-upload',
          sourceKey: 'pam-analyses',
          fileName: 'pam_analyses.csv',
          arrayTarget: {
            parentSourceKey: 'pam-deployment',
            arrayFieldPath: 'analyses',
            parentMatchField: 'deploymentTitle',
            rowMatchField: 'deploymentTitle',
          },
        },
        [
          record({
            sourceId: 'analyses-upload',
            externalId: 'analysis-1',
            data: { deploymentTitle: 'Example PAM Deployment', qualityAnalyst: 'Example Analyst' },
            sourceData: { deploymentTitle: 'Example PAM Deployment' },
          }),
        ]
      ),
    ]

    expect(
      mergeCSVArraySources({ parentSourceId: 'project-upload', loadedSources })[0].data
    ).toEqual({ project: 'Project' })
    expect(
      mergeCSVArraySources({ parentSourceId: 'deployment-upload', loadedSources })[0].data
    ).toEqual({
      deploymentTitle: 'Example PAM Deployment',
      recordings: [{ deploymentTitle: 'Example PAM Deployment', channels: [{ sampleRate: 48000 }] }],
      analyses: [{ deploymentTitle: 'Example PAM Deployment', qualityAnalyst: 'Example Analyst' }],
    })
  })

  it('orders document sources by their configured parent dependencies', () => {
    const projectSource = { sourceId: 'project', typeSlug: 'pam_project', role: 'parent' }
    const siteSource = {
      sourceId: 'site',
      typeSlug: 'pam_site',
      role: 'child',
      relationshipRule: {
        parentObjectTypeSlug: 'pam_project',
        childObjectTypeSlug: 'pam_site',
        predicate: 'has_parent',
      },
    }
    const deploymentSource = {
      sourceId: 'deployment',
      typeSlug: 'pam_deployment',
      role: 'child',
      relationshipRule: {
        parentObjectTypeSlug: 'pam_site',
        childObjectTypeSlug: 'pam_deployment',
        predicate: 'has_parent',
      },
    }
    const sources = [deploymentSource, siteSource, projectSource]

    expect(getCSVSourceDependencies(siteSource, sources)).toEqual(['project'])
    expect(getCSVSourceDependencies(deploymentSource, sources)).toEqual(['site'])
    expect(getCSVDocumentSourcesInDependencyOrder(sources).map(({ sourceId }) => sourceId)).toEqual([
      'project',
      'site',
      'deployment',
    ])
  })

  it('does not gate a child when its parent source is missing', () => {
    const childSource = {
      sourceId: 'child',
      typeSlug: 'children',
      relationshipRule: {
        parentObjectTypeSlug: 'parents',
        childObjectTypeSlug: 'children',
        predicate: 'has_parent',
      },
    }

    expect(getCSVSourceDependencies(childSource, [childSource])).toEqual([])
  })

  it('breaks cyclic dependency rules deterministically instead of blocking every source', () => {
    const sourceA = {
      sourceId: 'a',
      typeSlug: 'type-a',
      relationshipRule: {
        parentObjectTypeSlug: 'type-b',
        childObjectTypeSlug: 'type-a',
        predicate: 'has_parent',
      },
    }
    const sourceB = {
      sourceId: 'b',
      typeSlug: 'type-b',
      relationshipRule: {
        parentObjectTypeSlug: 'type-a',
        childObjectTypeSlug: 'type-b',
        predicate: 'has_parent',
      },
    }
    const ordered = getCSVDocumentSourcesInDependencyOrder([sourceA, sourceB])

    expect(
      ordered.map((source) => getCSVSourceExecutionDependencies(source, [sourceA, sourceB], ordered))
    ).toEqual([[], ['a']])
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

  it('lists unmatched array rows with their filename, data row, and lookup value', () => {
    const parentSource = { sourceId: 'parent-upload' }
    const arraySource = {
      sourceId: 'array-upload',
      fileName: 'pam_recordings.csv',
      arrayTarget: {
        parentSourceKey: 'parent-upload',
        arrayFieldPath: 'recordings',
        parentMatchField: 'deploymentTitle',
        rowMatchField: 'deploymentTitle',
      },
    }

    expect(() =>
      mergeCSVArraySources({
        parentSourceId: parentSource.sourceId,
        loadedSources: [
          loadedSource(parentSource, [
            record({ sourceId: parentSource.sourceId, externalId: 'parent-1', data: { deploymentTitle: 'Found' } }),
          ]),
          loadedSource(arraySource, [
            record({
              sourceId: arraySource.sourceId,
              externalId: 'array-1',
              data: { deploymentTitle: 'Missing' },
              sourceData: { deploymentTitle: 'Missing' },
            }),
          ]),
        ],
      })
    ).toThrow(
      '1 array row did not match a parent record.\nUnmatched rows:\n- pam_recordings.csv, data row 1 (deploymentTitle="Missing")'
    )
  })

  it('formats unmatched array rows as an actionable composition blocker', () => {
    expect(formatCSVRecordsError(new Error('1 array row did not match a parent record.'))).toBe(
      'Array composition blocked: 1 array row did not match a parent record. Correct the parent and row lookup columns or add the missing parent rows, then continue again.'
    )
    expect(
      formatCSVRecordsError(
        new Error(
          '1 array row did not match a parent record.\nUnmatched rows:\n- pam_recordings.csv, data row 1 (deploymentTitle="Missing")'
        )
      )
    ).toBe(
      'Array composition blocked: 1 array row did not match a parent record.\nUnmatched rows:\n- pam_recordings.csv, data row 1 (deploymentTitle="Missing")\nCorrect the parent and row lookup columns or add the missing parent rows, then continue again.'
    )
    expect(formatCSVRecordsError(new Error('Malformed CSV'))).toBe(
      'Could not load CSV records: Malformed CSV'
    )
  })
})
