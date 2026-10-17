// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider, createStore } from 'jotai'
import { MemoryRouter } from 'react-router-dom'
import { CSVMappingFixtureView } from '../testing/CSVMappingFixtureView'
import CSVImportPage from './csv'
import type { CSVImportViewConfig } from './csv'
import type { IDocument, IObjectSchema, IObjectType } from '@/types/types'
import type { ImportRelationshipRule } from '../types'
import {
    createCSVMappingFixture,
    createCSVMappingWorkbookFile,
} from '../testing/csvMappingFixture'
import contextStateAtom from '@/state/contextStateAtom'
import { uploadedImportSourcesAtom } from '../state/uploadedImportSources'

const testPorts = vi.hoisted(() => ({
    auth: vi.fn(() => ({ user: { access_token: 'test-token', profile: { sub: 'fixture-user' } } })),
    uploadFile: vi.fn(async () => 'fixture-file-uuid'),
    fetchExistingImportDocuments: vi.fn(async (): Promise<IDocument[]> => []),
    fetchDocumentsByDataFieldValues: vi.fn(async (): Promise<IDocument[]> => []),
    fetchObjectTypes: vi.fn(async (): Promise<IObjectType[]> => []),
    fetchObjectSchemas: vi.fn(async (): Promise<IObjectSchema[]> => []),
    postDocument: vi.fn(async ({ document }: { document: Record<string, unknown> }) => ({
        ...document,
        uuid: 'fixture-imported-document',
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
    })),
    patchDocument: vi.fn(async () => ({})),
    mergeImportDocumentViaRpc: vi.fn(async () => ({})),
    fetchExistingDocumentBySlug: vi.fn(async () => undefined),
    postRelationship: vi.fn(async () => ({})),
    fetchRelationships: vi.fn(async () => []),
    fetchSingleFromPostgrest: vi.fn(async () => null),
    postToPostgrest: vi.fn(async () => ({})),
    fetchListFromPostgrest: vi.fn(async () => []),
}))

vi.mock('@/auth/useAuth', () => ({ useAuth: testPorts.auth }))
vi.mock('react-oidc-context', () => ({ useAuth: testPorts.auth }))
vi.mock('../reconciliation_service', () => ({
    fetchExistingImportDocuments: testPorts.fetchExistingImportDocuments,
    fetchDocumentsByDataFieldValues: testPorts.fetchDocumentsByDataFieldValues,
    mergeImportDocumentViaRpc: testPorts.mergeImportDocumentViaRpc,
    fetchExistingDocumentBySlug: testPorts.fetchExistingDocumentBySlug,
}))
vi.mock('@/manage/document/services', () => ({
    postDocument: testPorts.postDocument,
    patchDocument: testPorts.patchDocument,
}))
vi.mock('@/manage/object_type/services', () => ({ fetchObjectTypes: testPorts.fetchObjectTypes }))
vi.mock('@/manage/object_schema/services', () => ({ fetchObjectSchemas: testPorts.fetchObjectSchemas }))
vi.mock('@/manage/relationship/services', () => ({
    postRelationship: testPorts.postRelationship,
    fetchRelationships: testPorts.fetchRelationships,
}))
vi.mock('@/services/postgrest/services', () => ({
    uploadFileToPostgrest: testPorts.uploadFile,
    fetchSingleFromPostgrest: testPorts.fetchSingleFromPostgrest,
    postToPostgrest: testPorts.postToPostgrest,
    fetchListFromPostgrest: testPorts.fetchListFromPostgrest,
}))

describe('CSV mapping editor fixture', () => {
    let blockedFetch: ReturnType<typeof vi.fn>
    const queryClients: QueryClient[] = []

    beforeEach(() => {
        blockedFetch = vi.fn(() => Promise.reject(new Error('Unexpected fetch in CSV mapping fixture test.')))
        vi.stubGlobal('fetch', blockedFetch)
    })

    afterEach(() => {
        try {
            expect(blockedFetch).not.toHaveBeenCalled()
        } finally {
            cleanup()
            queryClients.splice(0).forEach((queryClient) => queryClient.clear())
            vi.unstubAllGlobals()
        }
    })

    const mountFixture = () => {
        const fixture = createCSVMappingFixture()
        const store = createStore()
        store.set(contextStateAtom, fixture.contextState)
        const user = userEvent.setup()
        render(
            <Provider store={store}>
                <CSVMappingFixtureView />
            </Provider>
        )
        return user
    }

    const mountProductionCSVPage = (
        schema: IObjectSchema['json_schema'] = {
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string' } },
        },
        options: {
            viewConfig?: CSVImportViewConfig
            additionalObjectTypes?: IObjectType[]
            additionalSchemas?: IObjectSchema[]
        } = {}
    ) => {
        const fixture = createCSVMappingFixture()
        const cloneObjectType = (source: IObjectType): IObjectType => ({
            ...source,
            data: source.data
                ? {
                    ...source.data,
                    field_mappings: source.data.field_mappings
                        ? { ...source.data.field_mappings }
                        : undefined,
                }
                : undefined,
        })
        const cloneObjectSchema = (source: IObjectSchema): IObjectSchema => ({
            ...source,
            json_schema: structuredClone(source.json_schema),
        })
        const objectType = cloneObjectType(fixture.contextState.object_type[0])
        const objectSchema = {
            ...cloneObjectSchema(
                fixture.contextState.object_schema_defaults_by_object_type_uuid[objectType.uuid]
            ),
            json_schema: structuredClone(schema),
        }
        const objectTypes = [
            objectType,
            ...(options.additionalObjectTypes ?? []).map(cloneObjectType),
        ]
        const objectSchemas = [
            objectSchema,
            ...(options.additionalSchemas ?? []).map(cloneObjectSchema),
        ]
        const contextState = {
            ...fixture.contextState,
            object_type: objectTypes,
            object_type_by_uuid: Object.fromEntries(objectTypes.map((item) => [item.uuid, item])),
            object_type_by_slug: Object.fromEntries(objectTypes.map((item) => [item.slug, item])),
            object_schema: objectSchemas,
            object_schema_by_uuid: Object.fromEntries(objectSchemas.map((item) => [item.uuid, item])),
            object_schema_by_slug: Object.fromEntries(objectSchemas.map((item) => [item.slug, item])),
            object_schema_defaults_by_object_type_uuid: Object.fromEntries(
                objectSchemas
                    .filter((item) => item.is_type_default)
                    .map((item) => [item.object_type_uuid, item])
            ),
        }
        testPorts.fetchObjectTypes.mockResolvedValue(contextState.object_type)
        testPorts.fetchObjectSchemas.mockResolvedValue(contextState.object_schema)

        const store = createStore()
        store.set(contextStateAtom, contextState)
        store.set(uploadedImportSourcesAtom, [])
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
        queryClients.push(queryClient)
        const user = userEvent.setup()
        const productionPage = (
            <MemoryRouter initialEntries={['/csv-import']}>
                <CSVImportPage
                    viewConfig={options.viewConfig ?? {
                        mapping: 'required',
                        relationships: 'fixed',
                        knownObjectTypeSlug: objectType.slug,
                    }}
                />
            </MemoryRouter>
        )
        render(
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    {productionPage}
                </QueryClientProvider>
            </Provider>
        )
        return { fixture, user }
    }

    it('maps configured CSV and worksheet fields through the real editor controls', async () => {
        const user = mountFixture()
        const records = screen.getByTestId('mapped-records')
        const recordData = () => JSON.parse(records.textContent ?? '[]')[0].data as Record<string, unknown>
        const initialRecords = await screen.findByText(/North, Bay/)
        expect(initialRecords).toBeTruthy()
        await waitFor(() => {
            expect(records.textContent).toContain('"latitude": 44.25')
        })
        expect(recordData()).toMatchObject({
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
        expect(records.textContent).toContain('"owner": {')
        expect(records.textContent).toContain('"type": "stationary_marine"')
        expect(records.textContent).toContain('"parent_code": "P-9"')
        expect(records.textContent).toContain('"notes": "discard-me"')
        expect(screen.getByLabelText('Start at import').textContent).toBe('true')
        expect(JSON.parse(screen.getByLabelText('Relationship rules').textContent ?? '')).toEqual([
            expect.objectContaining({ childMatchField: 'parent_code' }),
        ])

        const unusedInclude = screen.getByRole('checkbox', { name: 'Include unused as data' })
        const unusedRow = unusedInclude.closest('tr') as HTMLElement
        await user.click(unusedInclude)
        await waitFor(() => expect(records.textContent).not.toContain('"notes"'))
        expect(screen.getByLabelText('Start at import').textContent).toBe('false')
        await user.click(unusedInclude)

        const unusedSchemaField = within(unusedRow).getByTestId(
            'schema-field-fixture-site-source-unused'
        )
        await user.click(unusedSchemaField)
        await user.clear(unusedSchemaField)
        await user.type(unusedSchemaField, 'alternateNotes')
        await user.click(await screen.findByRole('option', { name: /alternateNotes/ }))
        await waitFor(() => expect(records.textContent).toContain('"alternateNotes": "discard-me"'))

        const unusedRole = unusedRow.querySelector('select')
        expect(unusedRole).not.toBeNull()
        await user.selectOptions(unusedRole!, 'label')
        await waitFor(() => expect(records.textContent).toContain('"label": "discard-me"'))
        await user.selectOptions(unusedRole!, 'ignore')
        await waitFor(() => {
            expect(recordData()).not.toHaveProperty('metadata.alternateNotes')
            expect(recordData()).not.toHaveProperty('unused')
            expect(records.textContent).toContain('"parent_code": "P-9"')
            expect(records.textContent).toContain('"type": "stationary_marine"')
        })

        await user.click(screen.getByRole('button', { name: 'Worksheet' }))
        await waitFor(() => expect(records.textContent).toContain('"latitude": 44.25'))
        expect(records.textContent).toContain('"owner": {')
        expect(records.textContent).toContain('"parent_code": "P-9"')
    })

    it('uploads a binary XLSX, blocks an empty selection, and maps only the selected worksheet', async () => {
        const user = mountFixture()
        await user.upload(screen.getByLabelText('Upload XLSX workbook'), await createCSVMappingWorkbookFile())

        const sites = await screen.findByRole('checkbox', { name: 'Include Sites worksheet' })
        const deployments = screen.getByRole('checkbox', { name: 'Include Deployments worksheet' })
        expect(screen.queryByRole('checkbox', { name: 'Include Empty worksheet' })).toBeNull()
        await user.click(sites)
        await user.click(deployments)
        expect((screen.getByRole('button', { name: 'Add 0 selected sheets' }) as HTMLButtonElement).disabled).toBe(true)
        expect(screen.queryByTestId('mapped-records')).toBeNull()

        await user.click(deployments)
        await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))
        const records = await screen.findByTestId('mapped-records')
        await waitFor(() => expect(records.textContent).toContain('"slug": "deploy-2"'))
        expect(screen.getByLabelText('Active worksheet').textContent).toBe('Deployments.csv')
        expect(records.textContent).toContain('"label": "South Dock"')
        expect(records.textContent).toContain('"latitude": 12.5')
        expect(records.textContent).toContain('"parent_code": "P-2"')
        expect(records.textContent).not.toContain('site-1')
        expect(screen.getByRole('checkbox', { name: 'Include unused as data' })).toBeTruthy()
    })

    it('keeps multiple selected worksheet editors and canonical previews isolated', async () => {
        const user = mountFixture()
        await user.upload(screen.getByLabelText('Upload XLSX workbook'), await createCSVMappingWorkbookFile())
        await screen.findByRole('checkbox', { name: 'Include Sites worksheet' })
        await user.click(screen.getByRole('button', { name: 'Add 2 selected sheets' }))

        const records = await screen.findByTestId('mapped-records')
        await waitFor(() => expect(records.textContent).toContain('"slug": "site-1"'))
        expect(screen.getByLabelText('Active worksheet').textContent).toBe('Sites.csv')
        expect(records.textContent).toContain('"latitude": 44.25')
        expect(records.textContent).not.toContain('deploy-2')
        expect(screen.getByLabelText('Start at import').textContent).toBe('true')
        await user.click(screen.getByRole('checkbox', { name: 'Include unused as data' }))
        await waitFor(() => expect(records.textContent).not.toContain('"notes"'))
        expect(screen.getByLabelText('Start at import').textContent).toBe('false')

        await user.click(screen.getByRole('button', { name: 'Map Deployments' }))
        await waitFor(() => expect(records.textContent).toContain('"slug": "deploy-2"'))
        expect(screen.getByLabelText('Active worksheet').textContent).toBe('Deployments.csv')
        expect(records.textContent).toContain('"latitude": 12.5')
        expect(records.textContent).not.toContain('site-1')
        expect(records.textContent).toContain('"notes": "second-only"')
        expect(screen.getByLabelText('Start at import').textContent).toBe('true')

        await user.click(screen.getByRole('button', { name: 'Map Sites' }))
        await waitFor(() => expect(records.textContent).toContain('"slug": "site-1"'))
        expect(records.textContent).not.toContain('deploy-2')
        expect(records.textContent).not.toContain('"notes"')
        expect(screen.getByLabelText('Start at import').textContent).toBe('false')
    })

    it('hands an uploaded CSV from the production page to the shared controller and back before execution', async () => {
        const { user } = mountProductionCSVPage()
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
        expect(testPorts.uploadFile).toHaveBeenCalledOnce()
        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)
        await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })
        expect(screen.getByText('1 records loaded')).toBeTruthy()
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
        )
        expect(testPorts.postDocument).not.toHaveBeenCalled()
        expect(testPorts.patchDocument).not.toHaveBeenCalled()
        expect(testPorts.postRelationship).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
        expect(await screen.findByRole('button', { name: 'Discover selected' })).toBeTruthy()
        expect((screen.getByRole('button', { name: 'Back to CSV mapping' }) as HTMLButtonElement).disabled).toBe(false)
        expect(screen.getByText('Import mapped CSV sources')).toBeTruthy()
        expect(testPorts.postDocument).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Back to CSV mapping' }))
        expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
        expect(screen.getByText('fixture-sites.csv')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Continue to import' })).toBeTruthy()

        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
        )
        await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
        expect(await screen.findByRole('button', { name: 'Discover selected' })).toBeTruthy()
        expect(testPorts.postDocument).not.toHaveBeenCalled()
    })

    it('blocks shared handoff for a mapped CSV record that fails schema validation', async () => {
        const { user } = mountProductionCSVPage({
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string', minLength: 8 } },
        })
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
        await user.click(await screen.findByRole('button', { name: 'Prepare import' }))
        await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })
        expect(screen.getByText('1 records loaded')).toBeTruthy()
        await waitFor(() => expect(screen.getByText('0 valid · 1 invalid')).toBeTruthy())

        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        expect(sharedFlowButton.disabled).toBe(true)
        expect(screen.getByText(
            'Complete required mappings, validation, and duplicate review in CSV before using the shared workflow.'
        )).toBeTruthy()
        await user.click(sharedFlowButton)

        expect(await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })).toBeTruthy()
        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('blocks shared handoff when duplicate reconciliation is ambiguous', async () => {
        const { fixture, user } = mountProductionCSVPage()
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )
        const objectTypeUuid = fixture.contextState.object_type[0].uuid
        const existingDocuments: IDocument[] = ['existing-site-1', 'existing-site-2'].map((uuid) => ({
            uuid,
            slug: 'site-9',
            published: false,
            published_at: null,
            owner_sub: 'fixture-owner',
            lock_sub: null,
            locked_at: null,
            subs_for_select: [],
            roles_for_select: [],
            subs_for_update: [],
            roles_for_update: [],
            data: { value: 'deep' },
            attrs: { import: { source_id: 'fixture-site-source', external_id: 'site-9' } },
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: null,
            object_type_uuid: objectTypeUuid,
            label: 'Harbor',
            description: '',
        }))
        const previousFetchImplementation = testPorts.fetchExistingImportDocuments.getMockImplementation()
        const reconciliationCallsBefore = testPorts.fetchExistingImportDocuments.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        try {
            testPorts.fetchExistingImportDocuments.mockImplementation(async () => existingDocuments)
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
            await user.click(await screen.findByRole('button', { name: 'Prepare import' }))
            await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })
            expect(screen.getByText('1 records loaded')).toBeTruthy()
            await waitFor(() => expect(screen.getByText('1 valid · 0 invalid')).toBeTruthy())
            await waitFor(() => {
                expect(testPorts.fetchExistingImportDocuments.mock.calls.length).toBeGreaterThan(reconciliationCallsBefore)
                expect(screen.getByText('1 ambiguous; review details')).toBeTruthy()
            })

            const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
            expect(sharedFlowButton.disabled).toBe(true)
            expect(screen.getByText(
                'Complete required mappings, validation, and duplicate review in CSV before using the shared workflow.'
            )).toBeTruthy()
            await user.click(sharedFlowButton)

            expect(screen.getByRole('heading', { name: 'Import fixture-sites.csv' })).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
            expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

        } finally {
            if (previousFetchImplementation) {
                testPorts.fetchExistingImportDocuments.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('selects and maps only the chosen worksheet through the production CSV controller', async () => {
        const { user } = mountProductionCSVPage()
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
        await user.upload(
            screen.getByLabelText('Choose Excel workbook'),
            await createCSVMappingWorkbookFile()
        )

        const sitesSheet = await screen.findByRole('checkbox', { name: 'Sites' })
        expect(screen.getByRole('checkbox', { name: 'Deployments' })).toBeTruthy()
        expect(screen.queryByRole('checkbox', { name: 'Empty' })).toBeNull()
        await user.click(sitesSheet)
        await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))

        const csvSources = screen.getByRole('region', { name: 'CSV sources' })
        expect(within(csvSources).getByRole('button', { name: 'Deployments.csv' })).toBeTruthy()
        expect(within(csvSources).queryByRole('button', { name: 'Sites.csv' })).toBeNull()

        await user.click(screen.getByRole('button', { name: /Map fields/ }))
        expect(screen.getByRole('heading', { name: 'Deployments.csv' })).toBeTruthy()
        expect(screen.getByText('South Dock')).toBeTruthy()
        expect(screen.queryByText('North, Bay')).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('imports the selected workbook sheet through the legacy CSV control', async () => {
        const objectTypeSlug = createCSVMappingFixture().contextState.object_type[0].slug
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['display_name', 'owner_name', 'latitude', 'parent_code', 'unused'],
                properties: {
                    external_key: { type: 'string' },
                    display_name: { type: 'string' },
                    owner_name: { type: 'string' },
                    latitude: { type: 'number' },
                    parent_code: { type: 'string' },
                    unused: { type: 'string' },
                },
            },
            {
                viewConfig: {
                    mapping: 'required',
                    relationships: 'fixed',
                    knownObjectTypeSlug: objectTypeSlug,
                },
            }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
        await user.upload(
            screen.getByLabelText('Choose Excel workbook'),
            await createCSVMappingWorkbookFile()
        )
        const sitesSheet = await screen.findByRole('checkbox', { name: 'Sites' })
        await user.click(sitesSheet)
        await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))
        await user.click(screen.getByRole('button', { name: /Map fields/ }))
        const externalKeyRow = screen.getByRole('row', { name: /Include external_key as data/ })
        await user.selectOptions(within(externalKeyRow).getAllByRole('combobox')[0], 'slug')
        expect(screen.getByText('South Dock')).toBeTruthy()
        expect(screen.queryByText('North, Bay')).toBeNull()

        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        await screen.findByRole('heading', { name: 'Import Deployments.csv' })
        const importButton = await screen.findByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
        await waitFor(() => expect(importButton.disabled).toBe(false))
        await user.click(importButton)
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )

        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                slug: 'deploy-2',
                data: expect.objectContaining({ display_name: 'South Dock' }),
            }),
        }))
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('keeps production mapping previews isolated for multiple selected worksheets', async () => {
        const objectTypeSlug = createCSVMappingFixture().contextState.object_type[0].slug
        const { user } = mountProductionCSVPage(undefined, {
            viewConfig: {
                mapping: 'required',
                relationships: 'fixed',
                sourceConfigs: ['Sites', 'Deployments'].map((name) => ({
                    key: name.toLowerCase(),
                    label: name,
                    fileName: `${name}.csv`,
                    typeSlug: objectTypeSlug,
                    typeKnown: true,
                    mapping: 'required',
                })),
            },
        })
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
        await user.upload(
            screen.getByLabelText('Choose Excel workbook'),
            await createCSVMappingWorkbookFile()
        )
        await screen.findByRole('checkbox', { name: 'Sites' })
        await user.click(screen.getByRole('button', { name: 'Add 2 selected sheets' }))

        const csvSources = screen.getByRole('region', { name: 'CSV sources' })
        expect(within(csvSources).getByRole('button', { name: 'Sites.csv' })).toBeTruthy()
        expect(within(csvSources).getByRole('button', { name: 'Deployments.csv' })).toBeTruthy()

        await user.click(screen.getByRole('button', { name: /Map fields/ }))
        expect(screen.getByText('North, Bay')).toBeTruthy()
        expect(screen.getByText('South Dock')).toBeTruthy()

        const sitesSummary = screen.getByText(/Sites\.csv ·/)
        const deploymentsSummary = screen.getByText(/Deployments\.csv ·/)
        const sitesPanel = sitesSummary.closest('details')
        const deploymentsPanel = deploymentsSummary.closest('details')
        expect(sitesPanel).not.toBeNull()
        expect(deploymentsPanel).not.toBeNull()
        await user.click(sitesSummary)
        expect(sitesPanel?.open).toBe(false)
        expect(deploymentsPanel?.open).toBe(true)
        expect(within(deploymentsPanel!).getByText('South Dock')).toBeTruthy()

        await user.click(sitesSummary)
        await user.click(deploymentsSummary)
        expect(sitesPanel?.open).toBe(true)
        expect(deploymentsPanel?.open).toBe(false)
        expect(within(sitesPanel!).getByText('North, Bay')).toBeTruthy()

        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        const loadedSourcesSummary = await screen.findByText('2 sources loaded')
        expect(within(loadedSourcesSummary.parentElement!).getByRole('heading', {
            name: 'Import CSV records',
        })).toBeTruthy()
        const importSources = screen.getByRole('table', { name: 'CSV import sources' })
        expect(within(importSources).getAllByRole('cell')).toHaveLength(8)

        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('keeps object type selection isolated when editing one workbook source', async () => {
        const fixture = createCSVMappingFixture()
        const originalObjectType = fixture.contextState.object_type[0]
        const alternateObjectType: IObjectType = {
            ...originalObjectType,
            uuid: 'fixture-alternate-site-type',
            label: 'Alternate fixture sites',
            slug: 'alternate_fixture_site',
        }
        const alternateSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-alternate-site-schema',
            object_type_uuid: alternateObjectType.uuid,
            slug: 'alternate_fixture_site_default',
            label: 'Alternate fixture site default',
        }
        const { user } = mountProductionCSVPage(undefined, {
            viewConfig: {
                mapping: 'required',
                relationships: 'fixed',
                sourceConfigs: ['Sites', 'Deployments'].map((name) => ({
                    key: name.toLowerCase(),
                    label: name,
                    fileName: `${name}.csv`,
                    typeSlug: originalObjectType.slug,
                    typeKnown: true,
                    mapping: 'required',
                })),
            },
            additionalObjectTypes: [alternateObjectType],
            additionalSchemas: [alternateSchema],
        })
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
        await user.upload(
            screen.getByLabelText('Choose Excel workbook'),
            await createCSVMappingWorkbookFile()
        )
        await screen.findByRole('checkbox', { name: 'Sites' })
        await user.click(screen.getByRole('button', { name: 'Add 2 selected sheets' }))
        await user.click(screen.getByRole('button', { name: /Map fields/ }))
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))

        const importSources = screen.getByRole('table', { name: 'CSV import sources' })
        const editTypeButtons = await screen.findAllByRole('button', {
            name: 'Edit type & validate',
        })
        expect(editTypeButtons).toHaveLength(2)
        await user.click(editTypeButtons[0])

        let dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByRole('heading', { name: 'Sites.csv' })).toBeTruthy()
        const createTypeCheckbox = await within(dialog).findByRole('checkbox', {
            name: 'Create schema and object type from data',
        })
        if (
            createTypeCheckbox.getAttribute('aria-checked') === 'true' ||
            (createTypeCheckbox instanceof HTMLInputElement && createTypeCheckbox.checked)
        ) {
            await user.click(createTypeCheckbox)
        }
        const sitesTypeControl = within(dialog).getAllByRole('combobox')[0]
        if (sitesTypeControl instanceof HTMLSelectElement) {
            await user.selectOptions(sitesTypeControl, alternateObjectType.uuid)
        } else {
            await user.click(sitesTypeControl)
            await user.click(await screen.findByRole('option', { name: alternateObjectType.label }))
        }
        await waitFor(() =>
            expect(within(importSources).getByText(alternateObjectType.label)).toBeTruthy()
        )

        await user.keyboard('{Escape}')
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        await user.click(screen.getAllByRole('button', { name: 'Edit type & validate' })[1])

        dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByRole('heading', { name: 'Deployments.csv' })).toBeTruthy()
        const deploymentsTypeControl = within(dialog).getAllByRole('combobox')[0]
        if (deploymentsTypeControl instanceof HTMLSelectElement) {
            expect(deploymentsTypeControl.value).toBe(originalObjectType.uuid)
        } else {
            expect(deploymentsTypeControl.textContent).toContain(originalObjectType.label)
        }
        expect(within(importSources).getByText(originalObjectType.label)).toBeTruthy()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('blocks shared handoff for configured parent and child CSV relationships', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-parent-type',
            label: 'Fixture parents',
            slug: 'fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'fixture_parent_default',
            label: 'Fixture parent default',
            json_schema: {
                type: 'object',
                required: ['code'],
                properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                },
            },
        }
        const relationshipRule: ImportRelationshipRule = {
            parentObjectTypeSlug: parentObjectType.slug,
            childObjectTypeSlug: childObjectType.slug,
            parentMatchField: 'code',
            childMatchField: 'parent_code',
            predicate: 'has_parent',
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            relationshipRules: [relationshipRule],
            sourceConfigs: [
                {
                    key: 'parents',
                    label: 'Parent CSV',
                    fileName: 'parents.csv',
                    typeSlug: parentObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'parent',
                    relationshipFields: ['code'],
                },
                {
                    key: 'children',
                    label: 'Child CSV',
                    fileName: 'children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['value', 'parent_code'],
                properties: {
                    value: { type: 'string' },
                    parent_code: { type: 'string' },
                },
            },
            {
                viewConfig,
                additionalObjectTypes: [parentObjectType],
                additionalSchemas: [parentSchema],
            }
        )
        const parentFile = new File(
            ['id,code,name\nparent-1,P-1,Parent One'],
            'parents.csv',
            { type: 'text/csv' }
        )
        const childFile = new File(
            ['id,value,parent_code\nchild-1,deep,P-1'],
            'children.csv',
            { type: 'text/csv' }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(within(screen.getByRole('region', { name: 'Parent CSV' })).getByLabelText(/Browse Files/), parentFile)
        expect(await screen.findByText('Using parents.csv for this source.')).toBeTruthy()
        await user.upload(within(screen.getByRole('region', { name: 'Child CSV' })).getByLabelText(/Browse Files/), childFile)
        expect(await screen.findByText('Using children.csv for this source.')).toBeTruthy()

        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)
        const loadedSourcesSummary = await screen.findByText('2 sources loaded')
        expect(within(loadedSourcesSummary.parentElement!).getByRole('heading', { name: 'Import CSV records' })).toBeTruthy()

        const relationshipReview = await screen.findByRole('region', { name: 'CSV relationship review' })
        expect(within(relationshipReview).getByText('1 ready')).toBeTruthy()
        expect(within(relationshipReview).getByText('0 need resolution')).toBeTruthy()
        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        expect(sharedFlowButton.disabled).toBe(true)
        expect(screen.getByText(
            'CSV parent/child relationships and ignored relationship rows still use the CSV relationship workflow.'
        )).toBeTruthy()
        await waitFor(() => {
            expect((screen.getByRole('button', { name: 'Import 2 records' }) as HTMLButtonElement).disabled).toBe(false)
        })
        expect(screen.getByRole('button', { name: 'Link relationships' })).toBeTruthy()

        await user.click(sharedFlowButton)
        expect(screen.getByRole('region', { name: 'CSV relationship review' })).toBeTruthy()
        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('resolves a configured CSV relationship using an existing parent', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-parent-type',
            label: 'Fixture parents',
            slug: 'fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'fixture_parent_default',
            label: 'Fixture parent default',
            json_schema: {
                type: 'object',
                required: ['code'],
                properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                },
            },
        }
        const relationshipRule: ImportRelationshipRule = {
            parentObjectTypeSlug: parentObjectType.slug,
            childObjectTypeSlug: childObjectType.slug,
            parentMatchField: 'code',
            childMatchField: 'parent_code',
            predicate: 'has_parent',
            existingParentPolicy: 'lookup',
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            relationshipRules: [relationshipRule],
            sourceConfigs: [
                {
                    key: 'children',
                    label: 'Child CSV',
                    fileName: 'children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['value', 'parent_code'],
                properties: {
                    value: { type: 'string' },
                    parent_code: { type: 'string' },
                },
            },
            {
                viewConfig,
                additionalObjectTypes: [parentObjectType],
                additionalSchemas: [parentSchema],
            }
        )
        const childFile = new File(
            ['id,value,parent_code\nchild-1,deep,P-1'],
            'children.csv',
            { type: 'text/csv' }
        )
        const existingParentDocuments: IDocument[] = [{
            uuid: 'existing-parent-1',
            slug: 'parent-1',
            published: false,
            published_at: null,
            owner_sub: 'fixture-owner',
            lock_sub: null,
            locked_at: null,
            subs_for_select: [],
            roles_for_select: [],
            subs_for_update: [],
            roles_for_update: [],
            data: { code: 'P-1', name: 'Existing parent' },
            attrs: { import: { source_id: 'existing-parent-source', external_id: 'parent-1' } },
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: null,
            object_type_uuid: parentObjectType.uuid,
            label: 'Existing parent',
            description: '',
        }]
        const previousFetchImplementation = testPorts.fetchDocumentsByDataFieldValues.getMockImplementation()
        const lookupCallsBefore = testPorts.fetchDocumentsByDataFieldValues.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        try {
            testPorts.fetchDocumentsByDataFieldValues.mockImplementation(async () => existingParentDocuments)
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(
                within(screen.getByRole('region', { name: 'Child CSV' })).getByLabelText(/Browse Files/),
                childFile
            )
            expect(await screen.findByText('Using children.csv for this source.')).toBeTruthy()

            const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
            await waitFor(() => expect(prepareButton.disabled).toBe(false))
            await user.click(prepareButton)

            const relationshipReview = await screen.findByRole('region', { name: 'CSV relationship review' })
            await waitFor(() => {
                expect(within(relationshipReview).getByText('1 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('0 need resolution')).toBeTruthy()
                expect(within(relationshipReview).getByText('1 existing parent matches')).toBeTruthy()
                expect(testPorts.fetchDocumentsByDataFieldValues.mock.calls.length).toBeGreaterThan(lookupCallsBefore)
            })
            expect(testPorts.fetchDocumentsByDataFieldValues).toHaveBeenCalledWith(expect.objectContaining({
                objectTypeUuid: parentObjectType.uuid,
                fieldPath: 'code',
                values: ['P-1'],
                token: 'test-token',
                signal: expect.any(AbortSignal),
            }))

            const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
            expect(sharedFlowButton.disabled).toBe(true)
            expect(screen.getByText(
                'CSV parent/child relationships and ignored relationship rows still use the CSV relationship workflow.'
            )).toBeTruthy()
            await waitFor(() => {
                expect((screen.getByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement).disabled).toBe(false)
            })

            await user.click(sharedFlowButton)
            expect(screen.getByRole('region', { name: 'CSV relationship review' })).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
            expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('blocks CSV import when existing parent matches are ambiguous', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-parent-type',
            label: 'Fixture parents',
            slug: 'fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'fixture_parent_default',
            label: 'Fixture parent default',
            json_schema: {
                type: 'object',
                required: ['code'],
                properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                },
            },
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'user-configured',
            sourceConfigs: [
                {
                    key: 'children',
                    label: 'Child CSV',
                    fileName: 'children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['value', 'parent_code'],
                properties: {
                    value: { type: 'string' },
                    parent_code: { type: 'string' },
                },
            },
            {
                viewConfig,
                additionalObjectTypes: [parentObjectType],
                additionalSchemas: [parentSchema],
            }
        )
        const childFile = new File(
            ['id,value,parent_code\nchild-1,deep,P-1'],
            'children.csv',
            { type: 'text/csv' }
        )
        const existingParentDocuments: IDocument[] = [
            {
                uuid: 'existing-parent-1',
                slug: 'parent-1',
                published: false,
                published_at: null,
                owner_sub: 'fixture-owner',
                lock_sub: null,
                locked_at: null,
                subs_for_select: [],
                roles_for_select: [],
                subs_for_update: [],
                roles_for_update: [],
                data: { code: 'P-1', name: 'Existing parent one' },
                attrs: { import: { source_id: 'existing-parent-source-1', external_id: 'parent-1' } },
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: null,
                object_type_uuid: parentObjectType.uuid,
                label: 'Existing parent one',
                description: '',
            },
            {
                uuid: 'existing-parent-2',
                slug: 'parent-2',
                published: false,
                published_at: null,
                owner_sub: 'fixture-owner',
                lock_sub: null,
                locked_at: null,
                subs_for_select: [],
                roles_for_select: [],
                subs_for_update: [],
                roles_for_update: [],
                data: { code: 'P-1', name: 'Existing parent two' },
                attrs: { import: { source_id: 'existing-parent-source-2', external_id: 'parent-2' } },
                created_at: '2026-01-02T00:00:00.000Z',
                updated_at: null,
                object_type_uuid: parentObjectType.uuid,
                label: 'Existing parent two',
                description: '',
            },
        ]
        const previousFetchImplementation = testPorts.fetchDocumentsByDataFieldValues.getMockImplementation()
        const lookupCallsBefore = testPorts.fetchDocumentsByDataFieldValues.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        try {
            testPorts.fetchDocumentsByDataFieldValues.mockImplementation(async () => existingParentDocuments)
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(
                within(screen.getByRole('region', { name: 'Child CSV' })).getByLabelText(/Browse Files/),
                childFile
            )
            expect(await screen.findByText('Using children.csv for this source.')).toBeTruthy()
            await user.selectOptions(screen.getByLabelText('Parent object type'), parentObjectType.slug)
            await user.selectOptions(screen.getByLabelText('Parent match field'), 'code')
            await user.selectOptions(screen.getByLabelText('Child match field'), 'parent_code')

            const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
            await waitFor(() => expect(prepareButton.disabled).toBe(false))
            await user.click(prepareButton)

            const relationshipReview = await screen.findByRole('region', { name: 'CSV relationship review' })
            await waitFor(() => {
                expect(screen.getByText('1 valid · 0 invalid')).toBeTruthy()
                expect(within(relationshipReview).getByText('0 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
                expect(within(relationshipReview).getByText('2 existing parent matches')).toBeTruthy()
                expect(within(relationshipReview).getByText(/Multiple parents match child identity P-1/, { selector: 'span' })).toBeTruthy()
                expect(testPorts.fetchDocumentsByDataFieldValues.mock.calls.slice(lookupCallsBefore)).toContainEqual([
                    expect.objectContaining({
                        objectTypeUuid: parentObjectType.uuid,
                        fieldPath: 'code',
                        values: ['P-1'],
                        token: 'test-token',
                        signal: expect.any(AbortSignal),
                    }),
                ])
            })

            const parentChoice = screen.getByLabelText(/Choose parent for /) as HTMLSelectElement
            expect(parentChoice.value).toBe('')
            expect(Array.from(parentChoice.options).map((option) => option.textContent)).toEqual([
                'Choose matching parent',
                'Existing parent one (parent-1)',
                'Existing parent two (parent-2)',
            ])

            const linkButton = within(relationshipReview).getByRole('button', {
                name: 'Link relationships',
            }) as HTMLButtonElement
            expect(linkButton.disabled).toBe(true)
            await user.click(linkButton)

            const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
            expect(sharedFlowButton.disabled).toBe(true)
            expect(screen.getByText(
                'CSV parent/child relationships and ignored relationship rows still use the CSV relationship workflow.'
            )).toBeTruthy()
            await user.click(sharedFlowButton)

            const legacyImportButton = await screen.findByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
            expect(legacyImportButton.disabled).toBe(true)
            await user.click(legacyImportButton)
            expect(screen.getByRole('region', { name: 'CSV relationship review' })).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
            expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

            await user.selectOptions(parentChoice, 'existing-parent-1')
            await waitFor(() => {
                expect(within(relationshipReview).getByText('1 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('0 need resolution')).toBeTruthy()
                expect((screen.getByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement).disabled).toBe(false)
            })
            expect(screen.queryByLabelText(/Choose parent for /)).toBeNull()
            expect(within(relationshipReview).queryByText(/Multiple parents match child identity P-1/)).toBeNull()

            expect((within(relationshipReview).getByRole('button', { name: 'Link relationships' }) as HTMLButtonElement).disabled).toBe(true)
            expect(sharedFlowButton.disabled).toBe(true)
            expect(screen.getByText(
                'CSV parent/child relationships and ignored relationship rows still use the CSV relationship workflow.'
            )).toBeTruthy()
            await user.click(sharedFlowButton)
            expect(screen.getByRole('region', { name: 'CSV relationship review' })).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
            expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('blocks shared handoff for configured CSV array sources', async () => {
        const fixture = createCSVMappingFixture()
        const objectType = fixture.contextState.object_type[0]
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            knownObjectTypeSlug: objectType.slug,
            sourceConfigs: [
                {
                    key: 'parents',
                    label: 'Parent CSV',
                    fileName: 'parents.csv',
                    typeSlug: objectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'parent',
                },
                {
                    key: 'items',
                    label: 'Array items CSV',
                    fileName: 'items.csv',
                    typeSlug: objectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'array',
                    relationshipFields: ['parent_code'],
                    arrayTarget: {
                        parentSourceKey: 'parents',
                        arrayFieldPath: 'items',
                        parentMatchField: 'code',
                        rowMatchField: 'parent_code',
                    },
                },
            ],
        }
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['code', 'value', 'items'],
                properties: {
                    code: { type: 'string' },
                    value: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['value'],
                            properties: { value: { type: 'string' } },
                        },
                    },
                },
            },
            { viewConfig }
        )
        const parentFile = new File(
            ['code,value\nP-1,Parent one'],
            'parents.csv',
            { type: 'text/csv' }
        )
        const arrayFile = new File(
            ['parent_code,value\nP-1,Item one'],
            'items.csv',
            { type: 'text/csv' }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(
            within(screen.getByRole('region', { name: 'Parent CSV' })).getByLabelText(/Browse Files/),
            parentFile
        )
        expect(await screen.findByText('Using parents.csv for this source.')).toBeTruthy()
        await user.upload(
            within(screen.getByRole('region', { name: 'Array items CSV' })).getByLabelText(/Browse Files/),
            arrayFile
        )
        expect(await screen.findByText('Using items.csv for this source.')).toBeTruthy()

        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)
        const loadedSourcesSummary = await screen.findByText('2 sources loaded')
        expect(within(loadedSourcesSummary.parentElement!).getByRole('heading', { name: 'Import CSV records' })).toBeTruthy()
        await waitFor(() => expect(screen.getByText('1 valid · 0 invalid')).toBeTruthy())

        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        expect(sharedFlowButton.disabled).toBe(true)
        expect(screen.getByText(
            'Array item sources still use CSV array composition; continue with the CSV import workflow.'
        )).toBeTruthy()
        await waitFor(() => {
            const legacyImportButton = screen.getByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
            expect(legacyImportButton.disabled).toBe(false)
        })

        await user.click(sharedFlowButton)
        expect(within(loadedSourcesSummary.parentElement!).getByRole('heading', { name: 'Import CSV records' })).toBeTruthy()
        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(testPorts.postDocument.mock.calls.length).toBe(postDocumentCallsBefore)
        expect(testPorts.patchDocument.mock.calls.length).toBe(patchDocumentCallsBefore)
        expect(testPorts.postRelationship.mock.calls.length).toBe(relationshipCallsBefore)
    })

    it('blocks unmatched CSV array rows and resumes after a corrected upload', async () => {
        const fixture = createCSVMappingFixture()
        const objectType = fixture.contextState.object_type[0]
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            knownObjectTypeSlug: objectType.slug,
            sourceConfigs: [
                {
                    key: 'parents',
                    label: 'Parent CSV',
                    fileName: 'parents.csv',
                    typeSlug: objectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'parent',
                },
                {
                    key: 'items',
                    label: 'Array items CSV',
                    fileName: 'items.csv',
                    typeSlug: objectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'array',
                    relationshipFields: ['parent_code'],
                    arrayTarget: {
                        parentSourceKey: 'parents',
                        arrayFieldPath: 'items',
                        parentMatchField: 'code',
                        rowMatchField: 'parent_code',
                    },
                },
            ],
        }
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['code', 'value', 'items'],
                properties: {
                    code: { type: 'string' },
                    value: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['value'],
                            properties: { value: { type: 'string' } },
                        },
                    },
                },
            },
            { viewConfig }
        )
        const parentFile = new File(
            ['code,value\nP-1,Parent one'],
            'parents.csv',
            { type: 'text/csv' }
        )
        const arrayFile = new File(
            ['parent_code,value\nP-missing,Item one'],
            'items.csv',
            { type: 'text/csv' }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(
            within(screen.getByRole('region', { name: 'Parent CSV' })).getByLabelText(/Browse Files/),
            parentFile
        )
        expect(await screen.findByText('Using parents.csv for this source.')).toBeTruthy()
        await user.upload(
            within(screen.getByRole('region', { name: 'Array items CSV' })).getByLabelText(/Browse Files/),
            arrayFile
        )
        expect(await screen.findByText('Using items.csv for this source.')).toBeTruthy()

        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Array composition blocked: 1 array row did not match a parent record.')
        expect(alert.textContent).toContain('- items.csv, data row 1 (parent_code="P-missing")')
        expect(alert.textContent).toContain(
            'Correct the parent and row lookup columns or add the missing parent rows, then continue again.'
        )

        const sourcesRegion = screen.getByRole('region', { name: 'CSV sources' })
        expect(within(sourcesRegion).getByRole('button', { name: 'parents.csv' })).toBeTruthy()
        expect(within(sourcesRegion).getByRole('button', { name: 'items.csv' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Review mappings' })).toBeTruthy()
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        expect(screen.queryByRole('heading', { name: 'Import CSV records' })).toBeNull()
        expect(screen.queryByText('2 sources loaded')).toBeNull()
        expect(screen.queryByRole('button', { name: 'Use shared import flow' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Import 1 records' })).toBeNull()
        expect(testPorts.postDocument.mock.calls.length).toBe(postDocumentCallsBefore)
        expect(testPorts.patchDocument.mock.calls.length).toBe(patchDocumentCallsBefore)
        expect(testPorts.postRelationship.mock.calls.length).toBe(relationshipCallsBefore)

        const correctedArrayFile = new File(
            ['parent_code,value\nP-1,Item corrected'],
            'items.csv',
            { type: 'text/csv' }
        )
        await user.upload(
            within(screen.getByRole('region', { name: 'Array items CSV' })).getByLabelText(/Browse Files/),
            correctedArrayFile
        )

        const retryPrepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(retryPrepareButton.disabled).toBe(false))
        await user.click(retryPrepareButton)

        const recoveredSourcesSummary = await screen.findByText('2 sources loaded')
        expect(within(recoveredSourcesSummary.parentElement!).getByRole('heading', { name: 'Import CSV records' })).toBeTruthy()
        await waitFor(() => expect(screen.getByText('1 valid · 0 invalid')).toBeTruthy())
        expect(screen.queryByRole('alert')).toBeNull()
        expect(screen.queryByText(/P-missing/)).toBeNull()

        const recoveredLegacyImportButton = await screen.findByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
        await waitFor(() => expect(recoveredLegacyImportButton.disabled).toBe(false))

        const recoveredSharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        expect(recoveredSharedFlowButton.disabled).toBe(true)
        expect(screen.getByText(
            'Array item sources still use CSV array composition; continue with the CSV import workflow.'
        )).toBeTruthy()
        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(testPorts.postDocument.mock.calls.length).toBe(postDocumentCallsBefore)
        expect(testPorts.patchDocument.mock.calls.length).toBe(patchDocumentCallsBefore)
        expect(testPorts.postRelationship.mock.calls.length).toBe(relationshipCallsBefore)
    })

    it('disables return to CSV mapping during shared preparation and re-enables it when settled', async () => {
        const { user } = mountProductionCSVPage()
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )
        const previousFetchImplementation = testPorts.fetchExistingImportDocuments.getMockImplementation()
        let resolveExistingDocuments!: (documents: never[]) => void
        const existingDocuments = new Promise<never[]>((resolve) => {
            resolveExistingDocuments = resolve
        })
        let gateReleased = false
        const releaseGate = () => {
            if (gateReleased) return
            gateReleased = true
            resolveExistingDocuments([])
        }

        try {
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
            const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
            await waitFor(() => expect(prepareButton.disabled).toBe(false))
            await user.click(prepareButton)
            await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })
            await waitFor(() =>
                expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
            )
            await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
            await user.click(await screen.findByRole('button', { name: 'Discover selected' }))
            await screen.findByRole('button', { name: 'Prepare review' })

            testPorts.fetchExistingImportDocuments.mockImplementation(() => existingDocuments)
            const reconciliationCallsBefore = testPorts.fetchExistingImportDocuments.mock.calls.length
            await user.click(screen.getByRole('button', { name: 'Prepare review' }))
            await waitFor(() =>
                expect(testPorts.fetchExistingImportDocuments).toHaveBeenCalledTimes(reconciliationCallsBefore + 1)
            )

            const backToMapping = screen.getByRole('button', { name: 'Back to CSV mapping' }) as HTMLButtonElement
            await waitFor(() => expect(backToMapping.disabled).toBe(true))
            await user.click(backToMapping)
            expect(screen.getByText('Import mapped CSV sources')).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Map CSV fields' })).toBeNull()
            expect(testPorts.postDocument).not.toHaveBeenCalled()
            expect(testPorts.patchDocument).not.toHaveBeenCalled()
            expect(testPorts.postRelationship).not.toHaveBeenCalled()

            releaseGate()
            await waitFor(() => expect(backToMapping.disabled).toBe(false))
            await user.click(backToMapping)
            expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
            expect(screen.getByText('fixture-sites.csv')).toBeTruthy()
            expect(testPorts.postDocument).not.toHaveBeenCalled()
            expect(testPorts.patchDocument).not.toHaveBeenCalled()
            expect(testPorts.postRelationship).not.toHaveBeenCalled()
        } finally {
            releaseGate()
            if (previousFetchImplementation) {
                testPorts.fetchExistingImportDocuments.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('keeps return to CSV mapping locked after shared execution starts and succeeds', async () => {
        const { user } = mountProductionCSVPage()
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )
        const previousPostDocumentImplementation = testPorts.postDocument.getMockImplementation()
        let releaseWrite!: () => void
        const writeGate = new Promise<void>((resolve) => {
            releaseWrite = resolve
        })
        let notifyWriteStarted!: () => void
        const writeStarted = new Promise<void>((resolve) => {
            notifyWriteStarted = resolve
        })
        let writeGateReleased = false
        const releaseWriteGate = () => {
            if (writeGateReleased) return
            writeGateReleased = true
            releaseWrite()
        }

        try {
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
            await user.click(screen.getByRole('button', { name: 'Prepare import' }))
            await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })
            await waitFor(() =>
                expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
            )
            await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
            await user.click(await screen.findByRole('button', { name: 'Discover selected' }))
            await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
            const executeButton = await screen.findByRole('button', { name: 'Execute import' }) as HTMLButtonElement
            await waitFor(() => expect(executeButton.disabled).toBe(false))

            const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
            const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
            const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
            testPorts.postDocument.mockImplementation(async (args) => {
                notifyWriteStarted()
                await writeGate
                return previousPostDocumentImplementation!(args)
            })

            await user.click(executeButton)
            await writeStarted

            const backToMapping = screen.getByRole('button', { name: 'Back to CSV mapping' }) as HTMLButtonElement
            expect(backToMapping.disabled).toBe(true)
            expect(screen.getByRole('status').textContent).toBe(
                'Mapping is locked after shared execution starts so completed import results are preserved.'
            )
            await user.click(backToMapping)
            expect(screen.getByText('Import mapped CSV sources')).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Map CSV fields' })).toBeNull()

            releaseWriteGate()
            await screen.findByText('1 imported')
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull())
            expect(backToMapping.disabled).toBe(true)
            expect(screen.getByRole('status').textContent).toBe(
                'Mapping is locked after shared execution starts so completed import results are preserved.'
            )
            await user.click(backToMapping)
            expect(screen.getByText('Import mapped CSV sources')).toBeTruthy()
            expect(screen.queryByRole('heading', { name: 'Map CSV fields' })).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            releaseWriteGate()
            if (previousPostDocumentImplementation) {
                testPorts.postDocument.mockImplementation(previousPostDocumentImplementation)
            }
        }
    })
})