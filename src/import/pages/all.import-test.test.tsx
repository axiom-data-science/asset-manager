// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider, createStore } from 'jotai'
import { MemoryRouter } from 'react-router-dom'
import contextStateAtom from '@/state/contextStateAtom'
import { uploadedImportSourcesAtom } from '@/import/state/uploadedImportSources'
import { ImportAllView } from './all'
import { createCSVImportAdapter } from '../csv_adapter'
import { parseWorkbookFile } from '../workbook'
import { selectWorkbookSheets } from '../workbook_selection'
import {
    createCSVMappingFixture,
    createCSVMappingWorkbookFile,
} from '../testing/csvMappingFixture'
import { createImportAllFixtureRuntime } from '../testing/fixtureRuntime'
import { ERDDAPFixtureView } from '../testing/ERDDAPFixtureView'
import {
    createERDDAPFixtureRuntime,
    erddapFixtureCatalogUrl,
    erddapFixtureMetadataUrl,
} from '../testing/erddapFixture'

describe('Import All fixture UI', () => {
    let blockedFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        blockedFetch = vi.fn(() => Promise.reject(new Error('Unexpected fetch in Import All fixture test.')))
        vi.stubGlobal('fetch', blockedFetch)
    })

    afterEach(() => {
        try {
            expect(blockedFetch).not.toHaveBeenCalled()
        } finally {
            cleanup()
            vi.unstubAllGlobals()
        }
    })

    const mountFixture = (
        options: Parameters<typeof createImportAllFixtureRuntime>[0] = {},
        canWrite = true,
        onActivityChange?: (active: boolean) => void
    ) => {
        const fixture = createImportAllFixtureRuntime(options)
        const store = createStore()
        store.set(contextStateAtom, fixture.makeContextState())
        store.set(uploadedImportSourcesAtom, [])
        fixture.runtime.requestContextReload = () => {
            fixture.portCalls.contextReload += 1
            store.set(contextStateAtom, fixture.makeContextState())
        }
        const user = userEvent.setup()
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/import-test']}>
                    <ImportAllView
                        pageTitle="Import All fixture"
                        configuredSourceOverrides={fixture.sources}
                        token=""
                        canWrite={canWrite}
                        runtime={fixture.runtime}
                        includeUploadedSources={false}
                        allowManualTypeSetup={false}
                        onActivityChange={onActivityChange}
                    />
                </MemoryRouter>
            </Provider>
        )
        return { fixture, user }
    }

    const mountMappedCSV = (mappedSource: ReturnType<typeof createCSVMappingFixture>['source']) => {
        const fixture = createImportAllFixtureRuntime()
        const store = createStore()
        const mappingFixture = createCSVMappingFixture(mappedSource.fileText, {
            sourceId: mappedSource.sourceId,
            fileName: mappedSource.fileName,
            label: mappedSource.config.label,
        })
        const source = mappingFixture.source
        const adapter = createCSVImportAdapter({
            id: source.sourceId,
            label: source.config.label,
            text: source.fileText,
            mapping: source.mapping,
            relationshipFields: source.relationshipFields,
            fixedFields: { 'locationDetail.type': source.schemaChoiceValue ?? '' },
            fieldMappings: mappingFixture.contextState.object_type_by_uuid[
                source.selectedObjectTypeUuid ?? ''
            ]?.data?.field_mappings,
            sourceKey: source.config.key,
            schema: source.adapter.schema,
        })
        fixture.runtime.fetchObjectTypes = async () => mappingFixture.contextState.object_type
        fixture.runtime.fetchObjectSchemas = async () => mappingFixture.contextState.object_schema
        fixture.runtime.requestContextReload = () => undefined
        store.set(contextStateAtom, mappingFixture.contextState)
        store.set(uploadedImportSourcesAtom, [{
            type: source.typeSlug,
            label: source.config.label,
            sourceAdapter: adapter,
        }])
        const user = userEvent.setup()
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/import-test']}>
                    <ImportAllView
                        pageTitle="Mapped CSV fixture"
                        sourceIds={[]}
                        uploadedSourceIds={[source.sourceId]}
                        token=""
                        canWrite
                        runtime={fixture.runtime}
                        includeUploadedSources
                        allowManualTypeSetup={false}
                    />
                </MemoryRouter>
            </Provider>
        )
        return { fixture, user }
    }

    const mountSingleUploadedFixtureSource = () => {
        const fixture = createImportAllFixtureRuntime()
        const store = createStore()
        const source = fixture.sources[0]
        store.set(contextStateAtom, fixture.makeContextState())
        store.set(uploadedImportSourcesAtom, [source])
        fixture.runtime.requestContextReload = () => {
            fixture.portCalls.contextReload += 1
            store.set(contextStateAtom, fixture.makeContextState())
        }
        const user = userEvent.setup()
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/import-test']}>
                    <ImportAllView
                        pageTitle="Source revision fixture"
                        sourceIds={[]}
                        uploadedSourceIds={fixture.sources.map(({ sourceAdapter }) => sourceAdapter.id)}
                        token=""
                        canWrite
                        runtime={fixture.runtime}
                        includeUploadedSources
                        allowManualTypeSetup={false}
                    />
                </MemoryRouter>
            </Provider>
        )
        return { fixture, source, store, user }
    }

    it('reports active work and cancellation to the file handoff', async () => {
        const activity = vi.fn()
        const { fixture, user } = mountFixture({}, true, activity)
        fixture.holdDiscovery()
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await waitFor(() => expect(activity).toHaveBeenLastCalledWith(true))
        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        await waitFor(() => expect(activity).toHaveBeenLastCalledWith(false))
        expect(fixture.portCalls.postDocument).toBe(0)
    })

    it('imports documents and links from one Simplified action', async () => {
        const { fixture, user } = mountFixture()

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))

        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
        expect(fixture.portCalls.postDocument).toBe(3)
        expect(fixture.portCalls.postRelationship).toBe(2)
    })

    it('keeps Interactive as the default and waits for explicit execution', async () => {
        const { fixture, user } = mountFixture()

        expect((screen.getByRole('radio', { name: 'Interactive' }) as HTMLInputElement).checked).toBe(true)
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))

        expect(fixture.documents).toHaveLength(0)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
        await user.click(await screen.findByRole('button', { name: 'Execute import' }))
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
    })

    it('limits uploaded sources to the explicit handoff scope', async () => {
        const fixture = createImportAllFixtureRuntime()
        const store = createStore()
        store.set(contextStateAtom, fixture.makeContextState())
        const allowedUpload = {
            ...fixture.sources[0],
            label: 'Allowed upload',
            sourceAdapter: { ...fixture.sources[0].sourceAdapter, id: 'allowed-upload' },
        }
        const unrelatedUpload = {
            ...fixture.sources[1],
            label: 'Unrelated upload',
            sourceAdapter: { ...fixture.sources[1].sourceAdapter, id: 'unrelated-upload' },
        }
        store.set(uploadedImportSourcesAtom, [allowedUpload, unrelatedUpload])

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/import-test']}>
                    <ImportAllView
                        pageTitle="Scoped upload fixture"
                        configuredSourceOverrides={[fixture.sources[0]]}
                        uploadedSourceIds={['allowed-upload']}
                        token=""
                        canWrite
                        runtime={fixture.runtime}
                        includeUploadedSources
                        allowManualTypeSetup={false}
                    />
                </MemoryRouter>
            </Provider>
        )

        expect(screen.getByText('Allowed upload')).toBeTruthy()
        expect(screen.queryByText('Unrelated upload')).toBeNull()
        expect(screen.queryByText(fixture.sources[1].label)).toBeNull()
    })

    it.each(['simplified', 'interactive'] as const)(
        'prepares and imports real mapped CSV records in %s mode',
        async (mode) => {
            const mappedSource = createCSVMappingFixture().source
            const { fixture, user } = mountMappedCSV(mappedSource)

            if (mode === 'simplified') {
                await user.click(screen.getByRole('radio', { name: 'Simplified' }))
                await user.click(screen.getByRole('button', { name: 'Import' }))
            } else {
                await user.click(screen.getByRole('button', { name: 'Discover selected' }))
                await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
                await user.click(await screen.findByRole('button', { name: 'Execute import' }))
            }

            await waitFor(() => expect(fixture.documents).toHaveLength(1))
            expect(fixture.documents[0].data).toMatchObject({
                metadata: {
                    name: 'North, Bay',
                    summary: 'Line "one", checked',
                    owner: { name: 'Ada' },
                },
                locationDetail: {
                    type: 'stationary_marine',
                    deploymentLocation: { latitude: 44.25 },
                },
                parent_code: 'P-9',
            })
            expect(fixture.portCalls.postRelationship).toBe(0)
        }
    )

    it('imports only a selected sheet from a genuine XLSX workbook through the shared controller', async () => {
        const workbook = await createCSVMappingWorkbookFile()
        const sheets = await parseWorkbookFile(workbook)
        const [selectedSheet] = selectWorkbookSheets(sheets, new Set(['Deployments']))
        expect(selectedSheet).toBeDefined()
        const mappedSource = createCSVMappingFixture(selectedSheet.text, {
            sourceId: 'uploaded-deployments',
            fileName: `${selectedSheet.name}.csv`,
        }).source
        const { fixture, user } = mountMappedCSV(mappedSource)

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))

        await waitFor(() => expect(fixture.documents).toHaveLength(1))
        expect(fixture.documents[0].slug).toBe('deploy-2')
        expect(fixture.documents[0].data).toMatchObject({
            metadata: { name: 'South Dock' },
            locationDetail: { deploymentLocation: { latitude: 12.5 } },
            parent_code: 'P-2',
        })
    })

    it('adds uploaded sources after the shared view has mounted', async () => {
        const { fixture, store, user } = mountSingleUploadedFixtureSource()
        store.set(uploadedImportSourcesAtom, fixture.sources)
        expect(await screen.findByText('Fixture children', { selector: 'strong' })).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        await user.click(await screen.findByRole('button', { name: 'Execute import' }))
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
    })

    it('invalidates prepared evidence when an adapter changes under the same source ID', async () => {
        const { fixture, source, store, user } = mountSingleUploadedFixtureSource()
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        expect(await screen.findByRole('button', { name: 'Execute import' })).toBeTruthy()

        store.set(uploadedImportSourcesAtom, [{
            ...source,
            sourceAdapter: {
                ...source.sourceAdapter,
                schema: { ...source.sourceAdapter.schema, title: 'Changed mapped schema' },
            },
        }])

        await waitFor(() => expect(screen.getByText(/0 of 1 sources discovered/)).toBeTruthy())
        expect(fixture.documents).toHaveLength(0)
    })

    it('retains successful results and blocks execution after a post-write source change', async () => {
        const { fixture, source, store, user } = mountSingleUploadedFixtureSource()
        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))
        await waitFor(() => expect(fixture.documents).toHaveLength(1))
        const savedUuid = fixture.documents[0].uuid
        const writeAttempts = fixture.portCalls.postDocument

        store.set(uploadedImportSourcesAtom, [{
            ...source,
            sourceAdapter: {
                ...source.sourceAdapter,
                schema: { ...source.sourceAdapter.schema, title: 'Changed after write' },
            },
        }])

        expect(await screen.findByText(/Source mapping changed after execution began/)).toBeTruthy()
        expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(true)
        expect(fixture.documents[0].uuid).toBe(savedUuid)
        expect(fixture.portCalls.postDocument).toBe(writeAttempts)
    })

    it('pauses Simplified mode for configured reviews until acknowledged', async () => {
        const { fixture, user } = mountFixture()
        fixture.sources[1].workflowPolicy = { reviewSteps: ['mapping'] }

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        expect((screen.getByRole('radio', { name: 'Simplified' }) as HTMLInputElement).checked).toBe(true)
        await user.click(screen.getByRole('button', { name: 'Import' }))

        expect(await screen.findByText(/Complete mapping before executing/)).toBeTruthy()
        expect(fixture.documents).toHaveLength(0)
        await user.click(screen.getByRole('checkbox', { name: /Confirm mapping review/ }))
        expect((screen.getByRole('radio', { name: 'Simplified' }) as HTMLInputElement).checked).toBe(true)
        await user.click(screen.getByRole('button', { name: 'Import' }))

        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
    })

    it('does not skip configured required inputs in Simplified mode', async () => {
        const { fixture, user } = mountFixture()
        fixture.sources[1].workflowPolicy = {
            inputs: [{ key: 'required-code', label: 'Required code', step: 'mapping', required: true }],
        }

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))

        expect(await screen.findByText(/Complete mapping before executing: required-code/)).toBeTruthy()
        expect(fixture.documents).toHaveLength(0)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
    })

    it('pauses Simplified mode for an unavailable type instead of creating it implicitly', async () => {
        const { fixture, user } = mountFixture({ omitChildType: true })

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))

        expect(await screen.findByText(/Complete type-schema before executing/)).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Create missing types' })).toBeTruthy()
        expect(fixture.portCalls.createObjectType).toBe(0)
        expect(fixture.documents).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
        await user.click(screen.getByRole('button', { name: 'Create missing types' }))
        await waitFor(() => expect(fixture.portCalls.contextReload).toBe(1))
        await user.click(screen.getByRole('button', { name: 'Import' }))
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
        expect(fixture.portCalls.createObjectType).toBe(1)
    })

    it('blocks Simplified writes for invalid and ambiguous plans', async () => {
        const invalid = mountFixture()
        const adapter = invalid.fixture.sources[1].sourceAdapter
        const load = adapter.load
        adapter.load = async (input) => {
            const record = await load(input)
            return record.provenance.externalId === 'child-1'
                ? { ...record, data: { parentCode: 'P-1', value: 42 } }
                : record
        }
        await invalid.user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await invalid.user.click(screen.getByRole('button', { name: 'Import' }))
        expect(await screen.findByText(/Correct or exclude invalid records/)).toBeTruthy()
        expect(invalid.fixture.portCalls.postDocument).toBe(0)
        expect(invalid.fixture.portCalls.postRelationship).toBe(0)
        expect(invalid.fixture.documents).toHaveLength(0)
        expect(invalid.fixture.relationships).toHaveLength(0)
    })

    it('blocks Simplified writes for ambiguous existing-document matches', async () => {
        const { fixture, user } = mountFixture({ seedAmbiguousChildMatch: true })

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))

        expect(await screen.findByText(/Resolve ambiguous document matches/)).toBeTruthy()
        expect(fixture.documents).toHaveLength(0)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
        expect(fixture.portCalls.postRelationship).toBe(0)
    })

    it('disables Simplified import without write eligibility', async () => {
        const { fixture, user } = mountFixture({}, false)

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(true)
        expect(fixture.portCalls.postDocument).toBe(0)
        expect(fixture.portCalls.postRelationship).toBe(0)
    })

    it('blocks all writes when a discovered record fails schema validation', async () => {
        const { fixture, user } = mountFixture()
        const adapter = fixture.sources[1].sourceAdapter
        const load = adapter.load
        adapter.load = async (input) => {
            const record = await load(input)
            return record.provenance.externalId === 'child-1'
                ? { ...record, data: { parentCode: 'P-1', value: 42 } }
                : record
        }

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        expect(await screen.findByText('Resolve review issues below before moving to Import.')).toBeTruthy()
        expect(screen.getAllByText('1 invalid')).toHaveLength(2)
        await user.click(screen.getByRole('button', { name: 'Errors (1)' }))
        expect(await screen.findByText(/value/i)).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(fixture.documents).toHaveLength(0)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)
        expect(fixture.portCalls.postRelationship).toBe(0)
    })

    it('blocks execution and every write for ambiguous existing-document matches', async () => {
        const { fixture, user } = mountFixture({ seedAmbiguousChildMatch: true })

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))

        expect(await screen.findByText('Resolve review issues below before moving to Import.')).toBeTruthy()
        expect(screen.getByText('1 ambiguous')).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(fixture.seededDocuments).toHaveLength(2)
        expect(fixture.seededDocuments.map(({ slug, object_type_uuid }) => [slug, object_type_uuid])).toEqual([
            ['fixture-child-1', 'fixture-child-type'],
            ['fixture-child-1', 'fixture-child-type'],
        ])
        expect(new Set(fixture.seededDocuments.map(({ uuid }) => uuid)).size).toBe(2)
        expect(fixture.documents).toHaveLength(0)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postDocument).toBe(0)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)
        expect(fixture.portCalls.postRelationship).toBe(0)
    })

    it.each(['interactive', 'simplified'] as const)('retries only a failed document after fresh reconciliation and then completes links (%s)', async (mode) => {
        const { fixture, user } = mountFixture({ failDocumentSlugOnce: 'fixture-child-1' })

        if (mode === 'simplified') {
            await user.click(screen.getByRole('radio', { name: 'Simplified' }))
            await user.click(screen.getByRole('button', { name: 'Import' }))
        } else {
            await user.click(screen.getByRole('button', { name: 'Discover selected' }))
            await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
            await user.click(await screen.findByRole('button', { name: 'Execute import' }))
        }

        await waitFor(() => {
            expect(fixture.documents).toHaveLength(2)
            expect(screen.getByRole('button', { name: /Errors \([1-9]\d*\)/ })).toBeTruthy()
        })
        expect(fixture.documents.map(({ slug }) => slug).sort()).toEqual([
            'fixture-child-2',
            'fixture-parent-1',
        ])
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.postRelationship).toBe(0)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)
        const successfulDocuments = fixture.documents.map(({ uuid, slug, data }) => ({ uuid, slug, data }))
        const reconciliationLookupCount = fixture.reconciliationLookups.length
        const retryLookups = vi.spyOn(fixture.runtime, 'fetchExistingImportDocuments')
        const retryWrites = vi.spyOn(fixture.runtime, 'postDocument')

        await user.click(screen.getByRole('button', { name: /Errors \([1-9]\d*\)/ }))
        expect(await screen.findByText('Fixture document write failed once for fixture-child-1.')).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Plan' }))
        await user.click(await screen.findByRole('button', { name: 'Retry failed' }))

        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(screen.getByRole('button', { name: 'Errors (0)' })).toBeTruthy()
        })
        expect(fixture.reconciliationLookups.slice(reconciliationLookupCount)).toContainEqual([
            'fixture-child-1',
        ])
        expect(retryWrites).toHaveBeenCalledTimes(1)
        expect(retryLookups.mock.invocationCallOrder[0]).toBeLessThan(retryWrites.mock.invocationCallOrder[0])
        expect(fixture.documents.filter(({ slug }) => slug === 'fixture-child-1')).toHaveLength(1)
        expect(fixture.documents.filter(({ slug }) => slug === 'fixture-child-1')[0].data).toEqual({
            parentCode: 'P-1',
            value: 'one',
        })
        expect(fixture.documents.filter(({ slug }) => slug !== 'fixture-child-1')).toEqual(
            expect.arrayContaining(successfulDocuments.map((document) => expect.objectContaining(document)))
        )
        expect(fixture.documentWriteAttempts.filter((slug) => slug === 'fixture-parent-1')).toHaveLength(1)
        expect(fixture.documentWriteAttempts.filter((slug) => slug === 'fixture-child-2')).toHaveLength(1)
        expect(fixture.documentWriteAttempts.filter((slug) => slug === 'fixture-child-1')).toHaveLength(2)
        expect(fixture.relationships).toHaveLength(0)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)

        await user.click(screen.getByRole('button', { name: mode === 'simplified' ? 'Import' : 'Execute import' }))
        await waitFor(() => {
            expect(fixture.relationships).toHaveLength(2)
            expect(screen.getByRole('button', { name: 'Errors (0)' })).toBeTruthy()
        })
        expect(fixture.documentWriteAttempts).toHaveLength(4)
        expect(fixture.portCalls.postDocument).toBe(4)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)
        expect(fixture.relationshipAttempts).toHaveLength(2)
    })

    it('discovers, prepares a missing type, imports documents, and retries only unfinished links', async () => {
        const { fixture, user } = mountFixture({ omitChildType: true, failRelationshipOnce: true })

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        await user.click(await screen.findByRole('button', { name: 'Create missing types' }))

        const executeButton = await screen.findByRole('button', { name: 'Execute import' })
        expect(screen.queryByRole('button', { name: 'Prepare review' })).toBeNull()
        expect(fixture.portCalls.createObjectType).toBe(1)
        expect(fixture.portCalls.createObjectSchema).toBe(1)
        expect(fixture.portCalls.fetchObjectTypes).toBeGreaterThan(0)
        expect(fixture.portCalls.fetchObjectSchemas).toBeGreaterThan(0)
        expect(fixture.portCalls.fetchExistingImportDocuments).toBeGreaterThan(0)
        expect(fixture.portCalls.contextReload).toBe(1)

        await user.click(executeButton)
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(1)
            expect(screen.getByRole('button', { name: 'Errors (1)' })).toBeTruthy()
        })

        await user.click(screen.getByRole('button', { name: 'Errors (1)' }))
        expect(screen.getByText('Fixture relationship failed once.')).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Retry unfinished links' }))

        await waitFor(() => {
            expect(fixture.relationships).toHaveLength(2)
            expect(screen.getByRole('button', { name: 'Errors (0)' })).toBeTruthy()
        })
        expect(fixture.portCalls.postDocument).toBe(3)
        expect(fixture.portCalls.fetchExistingDocumentBySlug).toBeGreaterThan(0)
        expect(fixture.portCalls.fetchRelationships).toBeGreaterThan(0)
        expect(fixture.relationshipAttempts).toHaveLength(3)
    })

    it('retains completed links after cancellation and retries without rewriting documents', async () => {
        const { fixture, user } = mountFixture()
        fixture.holdRelationshipWrites(1)

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        await user.click(await screen.findByRole('button', { name: 'Execute import' }))
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(1)
            expect(fixture.portCalls.postRelationship).toBe(2)
        })
        const completedLink = fixture.relationships[0]
        await user.click(screen.getByRole('button', { name: /Discover sources/ }))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))
        const retryButton = await screen.findByRole('button', { name: 'Retry unfinished links' })
        expect(fixture.relationships).toEqual([completedLink])

        fixture.releaseRelationshipWrites()
        await user.click(retryButton)
        await waitFor(() => {
            expect(fixture.relationships).toHaveLength(2)
            expect(screen.getByRole('button', { name: 'Errors (0)' })).toBeTruthy()
        })
        expect(fixture.relationships[0]).toEqual(completedLink)
        expect(fixture.portCalls.postDocument).toBe(3)
        expect(fixture.portCalls.patchDocument).toBe(0)
        expect(fixture.portCalls.mergeImportDocumentViaRpc).toBe(0)
        expect(fixture.relationshipAttempts).toHaveLength(3)
    })

    it('cancels a held discovery through the screen and allows discovery to resume', async () => {
        const { fixture, user } = mountFixture()
        fixture.holdDiscovery()

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Discover selected' })).toBeTruthy()
        })

        fixture.releaseDiscovery()
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        expect(await screen.findByRole('button', { name: 'Prepare review' })).toBeTruthy()
        expect(fixture.documents).toHaveLength(0)
    })

    it('cancels and resumes the Simplified one-action flow without losing its mode', async () => {
        const { fixture, user } = mountFixture()
        fixture.holdDiscovery()

        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(screen.getByRole('button', { name: 'Import' }))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy()
        })

        fixture.releaseDiscovery()
        await user.click(screen.getByRole('button', { name: 'Import' }))
        await waitFor(() => {
            expect(fixture.documents).toHaveLength(3)
            expect(fixture.relationships).toHaveLength(2)
        })
    })

    it('discovers and prepares real ERDDAP composite records with typed schema evidence and no auth', async () => {
        const fixture = createERDDAPFixtureRuntime()
        vi.stubGlobal('fetch', fixture.fetch)
        const user = userEvent.setup()
        render(<ERDDAPFixtureView />)

        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        expect(await screen.findByText(/north_buoy/)).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Prepare review' }))

        await waitFor(() => {
            const prepared = JSON.parse(screen.getByTestId('erddap-prepared-records').textContent ?? '{}')
            expect(prepared.erddap_modl).toHaveLength(1)
            expect(prepared.erddap_modl_variable_metadata).toHaveLength(1)
        })
        const prepared = JSON.parse(screen.getByTestId('erddap-prepared-records').textContent ?? '{}')
        expect(prepared.erddap_modl[0]).toMatchObject({
            data: { title: 'North Buoy', id: 'NB-01', geospatial_lat_min: 41.25 },
            sourceData: {
                global_attributes: { history: 'Imported from the fixture catalog.' },
                variables: { sea_water_temperature: { actual_range: [-2.5, 32] } },
            },
            provenance: { sourceId: 'erddap_modl', externalId: 'north_buoy' },
        })
        expect(prepared.erddap_modl[0].data).not.toHaveProperty('acknowledgement')
        expect(prepared.erddap_modl_variable_metadata[0]).toMatchObject({
            data: {
                dataset_id: 'north_buoy',
                variables: { sea_water_temperature: { actual_range: [-2.5, 32] } },
            },
            provenance: {
                sourceId: 'erddap_modl_variable_metadata',
                externalId: 'north_buoy',
            },
        })
        const evidence = JSON.parse(screen.getByTestId('erddap-schema-evidence').textContent ?? '{}')
        expect(evidence.erddap_modl.required).toEqual(['title', 'id'])
        expect(evidence.erddap_modl.validation).toEqual([{ isValid: true, errors: [] }])
        expect(evidence.erddap_modl_variable_metadata.required).toEqual(['dataset_id'])
        expect(evidence.erddap_modl_variable_metadata.validation).toEqual([{ isValid: true, errors: [] }])
        expect(fixture.requests.map(({ url }) => url)).toEqual([
            erddapFixtureCatalogUrl,
            erddapFixtureMetadataUrl,
        ])
        expect(fixture.requests.every(({ method, headers }) =>
            method === 'GET' && !Object.keys(headers).some((name) => /auth|token/i.test(name))
        )).toBe(true)
    })
})