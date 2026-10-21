import { FileSpreadsheet } from 'lucide-react'
import type { JSONSchema6 } from 'json-schema'
import type {
    IDocument,
    IObjectSchema,
    IObjectType,
    IPredicate,
    IRelationship,
} from '@/types/types'
import type { IImportPageProps } from '../pages/import_records_page_impl'
import type { ImportAllRuntime } from '../pages/all'
import { createImportAllTypeCreationAdapter } from '../create_import_object_type'
import type { CanonicalImportRecord, ImportCandidate, ImportSourceAdapter } from '../types'
import { makeInitialContextState } from '@/state/contextStateAtom'
import { getImportSlugCandidates } from '../reconciliation'

const parentTypeUuid = 'fixture-parent-type'
const childTypeUuid = 'fixture-child-type'
const predicateUuid = 'fixture-has-child'
const parentSourceId = 'fixture-parent-source'
const childSourceId = 'fixture-child-source'
const parentTypeSlug = 'fixture_parent'
const childTypeSlug = 'fixture_child'

const parentSchema: JSONSchema6 = {
    type: 'object',
    required: ['code'],
    properties: { code: { type: 'string' } },
}

const childSchema: JSONSchema6 = {
    type: 'object',
    required: ['parentCode', 'value'],
    properties: {
        parentCode: { type: 'string' },
        value: { type: 'string' },
    },
}

const makeObjectType = (uuid: string, slug: string, label: string): IObjectType => ({
    uuid,
    owner_sub: 'fixture-owner',
    label,
    slug,
    category: 'document',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
})

const makeObjectSchema = (
    uuid: string,
    objectTypeUuid: string,
    slug: string,
    label: string,
    jsonSchema: JSONSchema6
): IObjectSchema => ({
    uuid,
    owner_sub: 'fixture-owner',
    object_type_uuid: objectTypeUuid,
    slug,
    label,
    description: 'In-memory Import All fixture schema',
    version: 1,
    is_type_default: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    json_schema: jsonSchema as Record<string, unknown>,
})

const fixtureRows = [
    {
        sourceId: parentSourceId,
        type: parentTypeSlug,
        externalId: 'parent-1',
        slug: 'fixture-parent-1',
        label: 'Fixture parent',
        data: { code: 'P-1' },
    },
    {
        sourceId: childSourceId,
        type: childTypeSlug,
        externalId: 'child-1',
        slug: 'fixture-child-1',
        label: 'Fixture child one',
        data: { parentCode: 'P-1', value: 'one' },
    },
    {
        sourceId: childSourceId,
        type: childTypeSlug,
        externalId: 'child-2',
        slug: 'fixture-child-2',
        label: 'Fixture child two',
        data: { parentCode: 'P-1', value: 'two' },
    },
] as const

const candidateFor = (row: (typeof fixtureRows)[number]): ImportCandidate => ({
    uuid: `candidate-${row.externalId}`,
    slug: row.slug,
    label: row.label,
    data: row.data,
    provenance: { sourceId: row.sourceId, externalId: row.externalId },
})

const recordFor = (row: (typeof fixtureRows)[number]): CanonicalImportRecord => ({
    uuid: `record-${row.externalId}`,
    slug: row.slug,
    label: row.label,
    description: '',
    data: row.data,
    attrs: {},
    sourceData: row.data,
    provenance: { sourceId: row.sourceId, externalId: row.externalId },
})

type FixtureSource = IImportPageProps & { sourceAdapter: ImportSourceAdapter }

const waitForFixtureGate = (gate: Promise<void>, signal?: AbortSignal): Promise<void> => {
    signal?.throwIfAborted()
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
        signal?.addEventListener('abort', abort, { once: true })
        gate.then(() => {
            signal?.removeEventListener('abort', abort)
            resolve()
        }, (error) => {
            signal?.removeEventListener('abort', abort)
            reject(error)
        })
    })
}

export const createImportAllFixtureRuntime = ({
    omitChildType = false,
    failRelationshipOnce = false,
    seedAmbiguousChildMatch = false,
    failDocumentSlugOnce,
}: {
    omitChildType?: boolean
    failRelationshipOnce?: boolean
    seedAmbiguousChildMatch?: boolean
    failDocumentSlugOnce?: string
} = {}) => {
    const objectTypes = [makeObjectType(parentTypeUuid, parentTypeSlug, 'Fixture parents')]
    const schemas = [
        makeObjectSchema('fixture-parent-schema', parentTypeUuid, 'fixture_parent_default', 'Fixture parent default', parentSchema),
    ]
    if (!omitChildType) {
        objectTypes.push(makeObjectType(childTypeUuid, childTypeSlug, 'Fixture children'))
        schemas.push(
            makeObjectSchema('fixture-child-schema', childTypeUuid, 'fixture_child_default', 'Fixture child default', childSchema)
        )
    }

    const documents: IDocument[] = []
    const seededDocuments: IDocument[] = seedAmbiguousChildMatch
        ? [1, 2].map((index) => ({
            uuid: `fixture-existing-child-${index}`,
            slug: 'fixture-child-1',
            published: false,
            published_at: null,
            owner_sub: 'fixture-owner',
            lock_sub: null,
            locked_at: null,
            subs_for_select: [],
            roles_for_select: [],
            subs_for_update: [],
            roles_for_update: [],
            data: { parentCode: 'P-1', value: 'one' },
            attrs: {},
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: null,
            object_type_uuid: childTypeUuid,
            label: 'Existing fixture child',
            description: '',
        }))
        : []
    const documentWriteAttempts: string[] = []
    const reconciliationLookups: string[][] = []
    const relationships: IRelationship[] = []
    const relationshipAttempts: Array<Omit<IRelationship, 'uuid'>> = []
    const portCalls = {
        fetchObjectTypes: 0,
        fetchObjectSchemas: 0,
        fetchExistingImportDocuments: 0,
        createObjectType: 0,
        createObjectSchema: 0,
        postDocument: 0,
        patchDocument: 0,
        mergeImportDocumentViaRpc: 0,
        fetchExistingDocumentBySlug: 0,
        postRelationship: 0,
        fetchRelationships: 0,
        contextReload: 0,
    }
    let nextDocumentUuid = 1
    let nextRelationshipUuid = 1
    let failureUsed = false
    let failedDocumentSlug: string | undefined
    let releaseRelationshipGate: (() => void) | undefined
    let relationshipGate: Promise<void> | undefined
    let relationshipGateAfter = 0
    let releaseDiscoveryGate: (() => void) | undefined
    let discoveryGate: Promise<void> | undefined
    const predicates: IPredicate[] = [
        {
            uuid: predicateUuid,
            predicate: 'fixture_has_child',
            label: 'has fixture child',
            is_directional: true,
        },
    ]

    const sources: FixtureSource[] = [
        {
            type: parentTypeSlug,
            label: 'Fixture parents',
            icon: FileSpreadsheet,
            sourceAdapter: {
                id: parentSourceId,
                defaultImportUrl: 'fixture://parents',
                schema: parentSchema,
                relationshipRules: [
                    {
                        parentObjectTypeSlug: parentTypeSlug,
                        childObjectTypeSlug: childTypeSlug,
                        parentMatchField: 'code',
                        childMatchField: 'parentCode',
                        predicate: 'fixture_has_child',
                    },
                ],
                discover: async ({ signal }) => {
                    if (discoveryGate) {
                        await waitForFixtureGate(discoveryGate, signal)
                    }
                    signal.throwIfAborted()
                    return [candidateFor(fixtureRows[0])]
                },
                load: async ({ candidate, signal }) => {
                    signal?.throwIfAborted()
                    return recordFor(fixtureRows.find((row) => row.externalId === candidate.provenance.externalId)!)
                },
            },
        },
        {
            type: childTypeSlug,
            label: 'Fixture children',
            icon: FileSpreadsheet,
            sourceAdapter: {
                id: childSourceId,
                defaultImportUrl: 'fixture://children',
                schema: childSchema,
                discover: async ({ signal }) => {
                    if (discoveryGate) {
                        await waitForFixtureGate(discoveryGate, signal)
                    }
                    signal.throwIfAborted()
                    return fixtureRows.slice(1).map(candidateFor)
                },
                load: async ({ candidate, signal }) => {
                    signal?.throwIfAborted()
                    return recordFor(fixtureRows.find((row) => row.externalId === candidate.provenance.externalId)!)
                },
            },
        },
    ]

    const makeContextState = () => {
        const state = makeInitialContextState()
        const objectTypeByUuid = Object.fromEntries(objectTypes.map((type) => [type.uuid, type]))
        const objectTypeBySlug = Object.fromEntries(objectTypes.map((type) => [type.slug, type]))
        const objectSchemaByUuid = Object.fromEntries(schemas.map((schema) => [schema.uuid, schema]))
        const objectSchemaBySlug = Object.fromEntries(schemas.map((schema) => [schema.slug, schema]))
        return {
            ...state,
            loaded: true,
            predicate: predicates,
            predicate_by_uuid: Object.fromEntries(predicates.map((predicate) => [predicate.uuid, predicate])),
            predicate_by_predicate: Object.fromEntries(predicates.map((predicate) => [predicate.predicate, predicate])),
            object_type: objectTypes,
            object_type_by_uuid: objectTypeByUuid,
            object_type_by_slug: objectTypeBySlug,
            object_schema: schemas,
            object_schema_by_uuid: objectSchemaByUuid,
            object_schema_by_slug: objectSchemaBySlug,
            object_schema_defaults_by_object_type_uuid: Object.fromEntries(
                schemas
                    .filter((schema) => schema.is_type_default)
                    .map((schema) => [schema.object_type_uuid, schema])
            ),
        }
    }

    const fetchExistingImportDocuments: ImportAllRuntime['fetchExistingImportDocuments'] = async ({
        records,
        objectTypeUuid,
        objectTypeSlug,
        signal,
    }) => {
        portCalls.fetchExistingImportDocuments += 1
        signal?.throwIfAborted()
        reconciliationLookups.push(records.map((record) => record.slug))
        const slugs = new Set(
            records.flatMap((record) => getImportSlugCandidates(record.slug, objectTypeSlug))
        )
        return [...seededDocuments, ...documents].filter(
            (document) => document.object_type_uuid === objectTypeUuid && slugs.has(document.slug)
        )
    }

    const fetchObjectTypes: ImportAllRuntime['fetchObjectTypes'] = async ({ signal }) => {
        portCalls.fetchObjectTypes += 1
        signal?.throwIfAborted()
        return [...objectTypes]
    }

    const fetchObjectSchemas: ImportAllRuntime['fetchObjectSchemas'] = async ({ signal }) => {
        portCalls.fetchObjectSchemas += 1
        signal?.throwIfAborted()
        return [...schemas]
    }

    const runtime: ImportAllRuntime = {
        fetchExistingImportDocuments,
        fetchObjectTypes,
        fetchObjectSchemas,
        postDocument: async <T>({
            document,
            signal,
        }: {
            document: Omit<IDocument<T>, 'owner_sub' | 'uuid' | 'created_at' | 'updated_at'>
            token: string
            signal?: AbortSignal
        }) => {
            portCalls.postDocument += 1
            signal?.throwIfAborted()
            documentWriteAttempts.push(document.slug)
            if (document.slug === failDocumentSlugOnce && failedDocumentSlug !== document.slug) {
                failedDocumentSlug = document.slug
                throw new Error(`Fixture document write failed once for ${document.slug}.`)
            }
            const saved: IDocument<T> = {
                ...document,
                uuid: `fixture-document-${nextDocumentUuid++}`,
                owner_sub: 'fixture-owner',
                published: false,
                published_at: null,
                lock_sub: null,
                locked_at: null,
                subs_for_select: [],
                roles_for_select: [],
                subs_for_update: [],
                roles_for_update: [],
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: null,
            } as IDocument<T>
            documents.push(saved)
            return saved
        },
        patchDocument: async ({ uuid, document, signal }) => {
            portCalls.patchDocument += 1
            signal?.throwIfAborted()
            const index = documents.findIndex((current) => current.uuid === uuid)
            if (index < 0) throw new Error(`Fixture document ${uuid} was not found.`)
            documents[index] = { ...documents[index], ...document }
            return documents[index]
        },
        mergeImportDocumentViaRpc: async ({ documentUuid, incomingDocument, signal }) => {
            portCalls.mergeImportDocumentViaRpc += 1
            signal?.throwIfAborted()
            const index = documents.findIndex((current) => current.uuid === documentUuid)
            if (index < 0) throw new Error(`Fixture document ${documentUuid} was not found.`)
            documents[index] = { ...documents[index], ...incomingDocument }
            return documents[index]
        },
        fetchExistingDocumentBySlug: async ({ slug, objectTypeUuid, signal }) => {
            portCalls.fetchExistingDocumentBySlug += 1
            signal?.throwIfAborted()
            return [...seededDocuments, ...documents].find(
                (document) => document.slug === slug && document.object_type_uuid === objectTypeUuid
            )
        },
        postRelationship: async ({ relationship, signal }) => {
            portCalls.postRelationship += 1
            relationshipAttempts.push(relationship)
            if (relationshipGate && relationships.length >= relationshipGateAfter) {
                await waitForFixtureGate(relationshipGate, signal)
            }
            signal?.throwIfAborted()
            if (failRelationshipOnce && !failureUsed) {
                failureUsed = true
                throw new Error('Fixture relationship failed once.')
            }
            const saved = { ...relationship, uuid: `fixture-relationship-${nextRelationshipUuid++}` }
            relationships.push(saved)
            return saved
        },
        fetchRelationships: async ({ params, signal }) => {
            portCalls.fetchRelationships += 1
            signal?.throwIfAborted()
            const filters = params?.filters ?? []
            return relationships.filter((relationship) =>
                filters.every((filter) => {
                    const value = filter.column === 'from_document_uuid'
                        ? relationship.from_document_uuid
                        : filter.column === 'to_document_uuid'
                            ? relationship.to_document_uuid
                            : filter.column === 'predicate_uuid'
                                ? relationship.predicate_uuid
                                : undefined
                    return value === filter.value
                })
            )
        },
        createAutomaticType: createImportAllTypeCreationAdapter({
            fetchTypes: fetchObjectTypes,
            fetchSchemas: fetchObjectSchemas,
            createType: async ({ object_type, signal }) => {
                portCalls.createObjectType += 1
                signal?.throwIfAborted()
                const created = makeObjectType(
                    object_type.slug === childTypeSlug ? childTypeUuid : `fixture-type-${objectTypes.length + 1}`,
                    object_type.slug,
                    object_type.label
                )
                objectTypes.push(created)
                return created
            },
            createSchema: async ({ object_schema, signal }) => {
                portCalls.createObjectSchema += 1
                signal?.throwIfAborted()
                const created = makeObjectSchema(
                    `fixture-schema-${schemas.length + 1}`,
                    object_schema.object_type_uuid,
                    object_schema.slug,
                    object_schema.label,
                    object_schema.json_schema as JSONSchema6
                )
                schemas.push(created)
                return created
            },
            inferSchema: async (source) => source.sourceAdapter.schema ?? childSchema,
        }),
        requestContextReload: () => {
            portCalls.contextReload += 1
        },
    }

    return {
        sources,
        runtime,
        makeContextState,
        documents,
        seededDocuments,
        documentWriteAttempts,
        reconciliationLookups,
        relationships,
        relationshipAttempts,
        portCalls,
        holdRelationshipWrites: (afterCompleted = 0) => {
            relationshipGateAfter = afterCompleted
            relationshipGate = new Promise<void>((resolve) => {
                releaseRelationshipGate = resolve
            })
        },
        releaseRelationshipWrites: () => {
            releaseRelationshipGate?.()
            releaseRelationshipGate = undefined
            relationshipGate = undefined
        },
        holdDiscovery: () => {
            discoveryGate = new Promise<void>((resolve) => {
                releaseDiscoveryGate = resolve
            })
        },
        releaseDiscovery: () => {
            releaseDiscoveryGate?.()
            releaseDiscoveryGate = undefined
            discoveryGate = undefined
        },
    }
}