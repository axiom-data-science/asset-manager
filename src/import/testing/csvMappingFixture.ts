import type { JSONSchema6 } from 'json-schema'
import type { IObjectSchema, IObjectType } from '@/types/types'
import { makeInitialContextState } from '@/state/contextStateAtom'
import { parseCSV } from '@/lib/csv'
import { createCSVImportAdapter } from '../csv_adapter'
import type { CSVImportMapping } from '../csv_adapter'
import type { CSVImportSource, CSVImportViewConfig } from '../pages/csv'

export const csvMappingWorkbookUrl = new URL('./fixtures/csv-mapping.xlsx', import.meta.url)

export const createCSVMappingWorkbookArrayBuffer = async (): Promise<ArrayBuffer> => {
  if (import.meta.env.SSR || import.meta.env.MODE === 'test') {
    const { readFile } = await import('node:fs/promises')
    const path = import.meta.env.MODE === 'test'
      ? 'src/import/testing/fixtures/csv-mapping.xlsx'
      : csvMappingWorkbookUrl
    return Uint8Array.from(await readFile(path)).buffer
  }
  const response = await fetch(csvMappingWorkbookUrl, { credentials: 'omit' })
  if (!response.ok) throw new Error(`Could not load workbook fixture: ${response.status}`)
  return response.arrayBuffer()
}

export const createCSVMappingWorkbookFile = async (): Promise<File> =>
  new File([await createCSVMappingWorkbookArrayBuffer()], 'csv-mapping-fixture.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

export const csvMappingFixtureText =
  'external_key,display_name,summary,owner_name,latitude,parent_code,unused\n' +
  'site-1,"North, Bay","Line ""one"", checked",Ada,44.25,P-9,discard-me'

export const csvMappingFixtureWorksheetData = [
  ['external_key', 'display_name', 'summary', 'owner_name', 'latitude', 'parent_code', 'unused'],
  ['site-1', 'North, Bay', 'Line "one", checked', 'Ada', 44.25, 'P-9', 'discard-me'],
]

export const csvMappingFixtureSchema: JSONSchema6 = {
  type: 'object',
  required: ['metadata', 'locationDetail'],
  properties: {
    metadata: {
      type: 'object',
      required: ['owner'],
      properties: {
        name: { type: 'string' },
        summary: { type: 'string' },
        owner: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },
        notes: { type: 'string' },
        alternateNotes: { type: 'string' },
      },
    },
    locationDetail: {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: { const: 'stationary_marine' },
            deploymentLocation: {
              type: 'object',
              required: ['latitude'],
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
          },
        },
        {
          type: 'object',
          properties: {
            type: { const: 'mobile' },
            cruise: { type: 'string' },
          },
        },
      ],
    },
    parent_code: { type: 'string' },
  },
}

const mapping: CSVImportMapping = {
  label: 'display_name',
  slug: 'external_key',
  externalId: 'external_key',
  description: 'summary',
  dataColumns: ['display_name', 'summary', 'owner_name', 'latitude', 'unused'],
  fieldMappings: {
    display_name: 'metadata.name',
    summary: 'metadata.summary',
    owner_name: 'metadata.owner.name',
    latitude: 'locationDetail.deploymentLocation.latitude',
    unused: 'metadata.notes',
  },
}

const relationshipRule = {
  parentObjectTypeSlug: 'fixture_parent',
  childObjectTypeSlug: 'fixture_site',
  parentMatchField: 'code',
  childMatchField: 'parent_code',
  predicate: 'belongs_to',
}

const fixtureObjectType: IObjectType = {
  uuid: 'fixture-site-type',
  owner_sub: 'fixture-owner',
  label: 'Fixture sites',
  slug: 'fixture_site',
  category: 'document',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  data: {
    field_mappings: {
      description: 'metadata.summary',
    },
  },
}

const fixtureSchema: IObjectSchema = {
  uuid: 'fixture-site-schema',
  owner_sub: 'fixture-owner',
  object_type_uuid: fixtureObjectType.uuid,
  slug: 'fixture_site_default',
  label: 'Fixture site default',
  description: 'In-memory CSV mapping fixture schema',
  version: 1,
  is_type_default: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  json_schema: csvMappingFixtureSchema as Record<string, unknown>,
}

export const csvMappingFixtureViewConfig: CSVImportViewConfig = {
  mapping: 'required',
  relationships: 'user-configured',
}

export const createCSVMappingFixture = (
  text = csvMappingFixtureText,
  options: { sourceId?: string; fileName?: string; label?: string } = {}
) => {
  const sourceId = options.sourceId ?? 'fixture-site-source'
  const fileName = options.fileName ?? 'sites.csv'
  const label = options.label ?? 'Fixture sites'
  const contextState = makeInitialContextState()
  contextState.object_type = [fixtureObjectType]
  contextState.object_type_by_uuid[fixtureObjectType.uuid] = fixtureObjectType
  contextState.object_type_by_slug[fixtureObjectType.slug] = fixtureObjectType
  contextState.object_schema = [fixtureSchema]
  contextState.object_schema_by_uuid[fixtureSchema.uuid] = fixtureSchema
  contextState.object_schema_by_slug[fixtureSchema.slug] = fixtureSchema
  contextState.object_schema_defaults_by_object_type_uuid[fixtureObjectType.uuid] = fixtureSchema

  const parsed = parseCSV(text)
  const source: CSVImportSource = {
    sourceId,
    config: {
      key: sourceId,
      label,
      fileName,
      typeSlug: fixtureObjectType.slug,
      typeKnown: true,
      mapping: 'required',
      schemaChoice: {
        key: 'deployment',
        branchPath: 'locationDetail',
        valuePath: 'locationDetail.type',
      },
    },
    role: 'child',
    typeSlug: fixtureObjectType.slug,
    selectedObjectTypeUuid: fixtureObjectType.uuid,
    fileName,
    fileText: text,
    schemaChoiceValue: 'stationary_marine',
    parsed,
    mapping: { ...mapping, fieldMappings: { ...mapping.fieldMappings } },
    relationshipFields: ['parent_code'],
    relationshipRule,
    adapter: createCSVImportAdapter({
      id: sourceId,
      label,
      text,
      mapping,
      relationshipFields: ['parent_code'],
      relationshipRules: [relationshipRule],
      fixedFields: { 'locationDetail.type': 'stationary_marine' },
      fieldMappings: fixtureObjectType.data?.field_mappings,
      schema: csvMappingFixtureSchema,
    }),
    startAtImport: true,
  }

  return {
    contextState,
    source,
    sources: [source],
    viewConfig: csvMappingFixtureViewConfig,
  }
}