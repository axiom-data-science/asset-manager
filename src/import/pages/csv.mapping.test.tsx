// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider, createStore } from 'jotai'
import { MemoryRouter } from 'react-router-dom'
import * as workbookModule from '../workbook'
import { CSVMappingFixtureView } from '../testing/CSVMappingFixtureView'
import CSVImportPage from './csv'
import type { CSVImportViewConfig } from './csv'
import type { IDocument, IObjectSchema, IObjectType } from '@/types/types'
import { parseCSV } from '@/lib/csv'
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
        expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
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

    it('advances a single CSV to mapping and keeps multi-file uploads on the upload step', async () => {
        const { user } = mountProductionCSVPage()
        const firstFile = new File(
            ['id,name,value\nsite-1,North,deep'],
            'first-sites.csv',
            { type: 'text/csv' }
        )
        const secondFile = new File(
            ['id,name,value\nsite-2,South,shallow'],
            'second-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), firstFile)
        expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()

        await user.click(screen.getByRole('button', { name: 'Back to upload' }))
        await user.click(screen.getByRole('checkbox', { name: 'Upload multiple files in this session' }))
        await user.upload(screen.getByLabelText(/Browse Files/), secondFile)
        expect(await screen.findByRole('button', { name: 'Review mappings' })).toBeTruthy()
        expect(screen.queryByRole('heading', { name: 'Map CSV fields' })).toBeNull()

        await user.click(screen.getByRole('button', { name: 'Review mappings' }))
        expect(await screen.findByText(/1 records, 2 sources/)).toBeTruthy()
        const uploadedFiles = within(screen.getByRole('region', { name: 'Uploaded CSV files' }))
        expect(uploadedFiles.getByText(/first-sites\.csv/)).toBeTruthy()
        expect(uploadedFiles.getByText(/second-sites\.csv/)).toBeTruthy()
        const firstFilePanel = uploadedFiles.getByText(/first-sites\.csv/).closest('details') as HTMLElement
        const secondFilePanel = uploadedFiles.getByText(/second-sites\.csv/).closest('details') as HTMLElement
        const firstValueRow = within(firstFilePanel).getByRole('row', { name: /Include value as data/ })
        const secondValueRow = within(secondFilePanel).getByRole('row', { name: /Include value as data/ })
        const firstValueRole = within(firstValueRow).getAllByRole('combobox')[0] as HTMLSelectElement
        const secondValueRole = within(secondValueRow).getAllByRole('combobox')[0] as HTMLSelectElement
        await user.selectOptions(firstValueRole, 'label')
        expect(firstValueRole.value).toBe('label')
        expect(secondValueRole.value).toBe('data')
        expect(testPorts.postDocument).not.toHaveBeenCalled()
        expect(testPorts.patchDocument).not.toHaveBeenCalled()
        expect(testPorts.postRelationship).not.toHaveBeenCalled()
    })

    it('hands multiple standalone CSV uploads to the shared controller for discovery without writing', async () => {
        const { user } = mountProductionCSVPage()
        const firstFile = new File(
            ['id,name,value\nsite-1,North,deep'],
            'first-sites.csv',
            { type: 'text/csv' }
        )
        const secondFile = new File(
            ['id,name,value\nsite-2,South,shallow'],
            'second-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), firstFile)
        expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Back to upload' }))
        await user.click(screen.getByRole('checkbox', { name: 'Upload multiple files in this session' }))
        await user.upload(screen.getByLabelText(/Browse Files/), secondFile)
        await user.click(screen.getByRole('button', { name: 'Review mappings' }))
        expect(await screen.findByText(/1 records, 2 sources/)).toBeTruthy()

        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        expect(await screen.findByText('2 sources loaded')).toBeTruthy()
        expect(testPorts.postDocument).not.toHaveBeenCalled()
        expect(testPorts.patchDocument).not.toHaveBeenCalled()
        expect(testPorts.postRelationship).not.toHaveBeenCalled()

        await waitFor(() =>
            expect(screen.getAllByText(/valid ·/).map((element) => element.textContent)).toEqual([
                '1 valid · 0 invalid',
                '1 valid · 0 invalid',
            ])
        )
        await waitFor(() => expect(screen.getAllByText('None found')).toHaveLength(2))
        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
        )
        await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
        expect(await screen.findByRole('button', { name: 'Discover selected' })).toBeTruthy()
        expect(screen.getByText('First Sites')).toBeTruthy()
        expect(screen.getByText('Second Sites')).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        expect(await screen.findByText('2 of 2 sources discovered')).toBeTruthy()
        expect(testPorts.postDocument).not.toHaveBeenCalled()
        expect(testPorts.patchDocument).not.toHaveBeenCalled()
        expect(testPorts.postRelationship).not.toHaveBeenCalled()
    }, 30000)

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
        expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
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
            expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))
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

    it('blocks shared handoff when duplicate reconciliation fails', async () => {
        const { user } = mountProductionCSVPage()
        const csvFile = new File(
            ['id,name,value\nsite-9,Harbor,deep'],
            'fixture-sites.csv',
            { type: 'text/csv' }
        )
        const previousFetchImplementation = testPorts.fetchExistingImportDocuments.getMockImplementation()
        const reconciliationCallsBefore = testPorts.fetchExistingImportDocuments.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        try {
            testPorts.fetchExistingImportDocuments.mockRejectedValue(
                new Error('Fixture duplicate lookup failed.')
            )
            await user.click(screen.getByRole('button', { name: 'CSV files' }))
            await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
            expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))
            await screen.findByRole('heading', { name: 'Import fixture-sites.csv' })

            await waitFor(() =>
                expect(testPorts.fetchExistingImportDocuments.mock.calls.length)
                    .toBeGreaterThan(reconciliationCallsBefore)
            )
            expect(await screen.findByText('Duplicate check failed')).toBeTruthy()
            const sharedFlowButton = screen.getByRole('button', {
                name: 'Use shared import flow',
            }) as HTMLButtonElement
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

    it('applies configured assumed mappings and fixed schema-choice fields before validation', async () => {
        const objectTypeSlug = createCSVMappingFixture().contextState.object_type[0].slug
        const { user } = mountProductionCSVPage({
            type: 'object',
            required: ['value', 'locationDetail'],
            properties: {
                value: { type: 'string' },
                locationDetail: {
                    oneOf: [
                        {
                            type: 'object',
                            required: ['type'],
                            properties: { type: { const: 'stationary_marine' } },
                        },
                        {
                            type: 'object',
                            required: ['type'],
                            properties: { type: { const: 'mobile' } },
                        },
                    ],
                },
            },
        }, {
            viewConfig: {
                mapping: 'assumed',
                relationships: 'fixed',
                sourceConfigs: [{
                    key: 'sites',
                    label: 'Sites',
                    fileName: 'configured-sites.csv',
                    typeSlug: objectTypeSlug,
                    typeKnown: true,
                    mapping: 'assumed',
                    schemaChoice: {
                        key: 'deployment',
                        branchPath: 'locationDetail',
                        valuePath: 'locationDetail.type',
                    },
                }],
                schemaChoices: [{
                    key: 'deployment',
                    label: 'Deployment type',
                    placeholder: 'Choose a deployment type',
                    options: [
                        { value: 'stationary_marine', label: 'Stationary marine' },
                        { value: 'mobile', label: 'Mobile' },
                    ],
                }],
            },
        })
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
        const csvFile = new File(
            ['id,name,value\nsite-12,Harbor,deep'],
            'configured-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.selectOptions(screen.getByLabelText('Deployment type'), 'stationary_marine')
        await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
        await user.click(await screen.findByRole('button', { name: 'Prepare import' }))
        const importButton = await screen.findByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
        await waitFor(() => expect(importButton.disabled).toBe(false))
        await user.click(importButton)
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )

        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                slug: 'site-12',
                data: expect.objectContaining({
                    value: 'deep',
                    locationDetail: { type: 'stationary_marine' },
                }),
            }),
        }))
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('applies a production UI schema-field override before importing a CSV', async () => {
        const objectTypeSlug = createCSVMappingFixture().contextState.object_type[0].slug
        const { user } = mountProductionCSVPage({
            type: 'object',
            required: ['canonical_value'],
            properties: { canonical_value: { type: 'string' } },
        }, {
            viewConfig: {
                mapping: 'required',
                relationships: 'fixed',
                sourceConfigs: [{
                    key: 'sites',
                    label: 'Sites',
                    fileName: 'override-sites.csv',
                    typeSlug: objectTypeSlug,
                    typeKnown: true,
                    mapping: 'required',
                }],
            },
        })
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
        const csvFile = new File(
            ['id,name,raw_payload\nsite-13,Inlet,measured'],
            'override-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
        await user.click(await screen.findByRole('button', { name: 'Review mappings' }))
        const rawPayloadField = await screen.findByTestId('schema-field-sites-1-raw_payload')
        await user.click(rawPayloadField)
        await user.clear(rawPayloadField)
        await user.type(rawPayloadField, 'canonical_value')
        await user.click(await screen.findByRole('option', { name: /canonical_value/ }))
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        const importButton = await screen.findByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
        await waitFor(() => expect(importButton.disabled).toBe(false))
        await user.click(importButton)
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )

        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                slug: 'site-13',
                data: expect.objectContaining({ canonical_value: 'measured' }),
            }),
        }))
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('preserves a production CSV field override through shared-flow execution', async () => {
        const objectTypeSlug = createCSVMappingFixture().contextState.object_type[0].slug
        const { user } = mountProductionCSVPage({
            type: 'object',
            required: ['canonical_value'],
            properties: { canonical_value: { type: 'string' } },
        }, {
            viewConfig: {
                mapping: 'required',
                relationships: 'fixed',
                sourceConfigs: [{
                    key: 'sites',
                    label: 'Sites',
                    fileName: 'shared-override-sites.csv',
                    typeSlug: objectTypeSlug,
                    typeKnown: true,
                    mapping: 'required',
                }],
            },
        })
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const csvFile = new File(
            ['id,name,raw_payload\nsite-14,Inlet,measured'],
            'shared-override-sites.csv',
            { type: 'text/csv' }
        )

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(screen.getByLabelText(/Browse Files/), csvFile)
        await user.click(await screen.findByRole('button', { name: 'Review mappings' }))
        const rawPayloadField = await screen.findByTestId('schema-field-sites-1-raw_payload')
        await user.click(rawPayloadField)
        await user.clear(rawPayloadField)
        await user.type(rawPayloadField, 'canonical_value')
        await user.click(await screen.findByRole('option', { name: /canonical_value/ }))
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))
        await screen.findByRole('heading', { name: 'Import shared-override-sites.csv' })

        await waitFor(() =>
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
        )
        await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(await screen.findByRole('button', { name: 'Import' }))
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )

        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                slug: 'site-14',
                data: expect.objectContaining({ canonical_value: 'measured' }),
            }),
        }))
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

        const sitesUnusedRow = within(sitesPanel!).getByRole('row', { name: /Include unused as data/ })
        const sitesUnusedRole = within(sitesUnusedRow).getAllByRole('combobox')[0] as HTMLSelectElement
        await user.selectOptions(sitesUnusedRole, 'label')
        expect(sitesUnusedRole.value).toBe('label')

        await user.click(deploymentsSummary)
        const deploymentsUnusedRow = within(deploymentsPanel!).getByRole('row', { name: /Include unused as data/ })
        const deploymentsUnusedRole = within(deploymentsUnusedRow).getAllByRole('combobox')[0] as HTMLSelectElement
        expect(deploymentsUnusedRole.value).toBe('data')

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

    it('blocks an array-only workbook when its configured parent source is missing', async () => {
        const fixture = createCSVMappingFixture()
        const objectType = fixture.contextState.object_type[0]
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['display_name'],
                properties: {
                    display_name: { type: 'string' },
                    parent_code: { type: 'string' },
                },
            },
            {
                viewConfig: {
                    mapping: 'required',
                    relationships: 'fixed',
                    sourceConfigs: [
                        {
                            key: 'deployment-items',
                            label: 'Deployment items',
                            fileName: 'Deployments.csv',
                            typeSlug: objectType.slug,
                            typeKnown: true,
                            mapping: 'assumed',
                            role: 'array',
                            relationshipFields: ['parent_code'],
                            arrayTarget: {
                                parentSourceKey: 'sites',
                                arrayFieldPath: 'items',
                                parentMatchField: 'code',
                                rowMatchField: 'parent_code',
                            },
                        },
                    ],
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

        const csvSources = screen.getByRole('region', { name: 'CSV sources' })
        expect(within(csvSources).getByRole('button', { name: 'Deployments.csv' })).toBeTruthy()
        expect(within(csvSources).queryByRole('button', { name: 'Sites.csv' })).toBeNull()

        await user.click(screen.getByRole('button', { name: 'Review mappings' }))
        await user.click(screen.getByRole('button', { name: 'Continue to import' }))

        expect((await screen.findByRole('alert')).textContent).toContain(
            'Upload the configured document source before importing array rows: Deployments.csv'
        )
        expect(screen.queryByRole('heading', { name: 'Import CSV records' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Use shared import flow' })).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('composes a selected workbook array sheet into its configured parent source', async () => {
        const fixture = createCSVMappingFixture()
        const objectType = fixture.contextState.object_type[0]
        const workbookSheets = [
            {
                name: 'Sites',
                text: 'code,value\nP-1,Parent one',
                parsed: parseCSV('code,value\nP-1,Parent one'),
            },
            {
                name: 'Items',
                text: 'parent_code,value\nP-1,Item one',
                parsed: parseCSV('parent_code,value\nP-1,Item one'),
            },
        ]
        const parseWorkbookSpy = vi.spyOn(workbookModule, 'parseWorkbookFile')
            .mockResolvedValue(workbookSheets)
        const { user } = mountProductionCSVPage(
            {
                type: 'object',
                required: ['code', 'value', 'items'],
                properties: {
                    code: { type: 'string' },
                    value: { type: 'string' },
                    items: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['value'],
                            properties: { value: { type: 'string' } },
                        },
                    },
                },
            },
            {
                viewConfig: {
                    mapping: 'assumed',
                    relationships: 'fixed',
                    sourceConfigs: [
                        {
                            key: 'sites',
                            label: 'Sites',
                            fileName: 'Sites.csv',
                            typeSlug: objectType.slug,
                            typeKnown: true,
                            mapping: 'assumed',
                            role: 'parent',
                        },
                        {
                            key: 'items',
                            label: 'Items',
                            fileName: 'Items.csv',
                            typeSlug: objectType.slug,
                            typeKnown: true,
                            mapping: 'assumed',
                            role: 'array',
                            relationshipFields: ['parent_code'],
                            arrayTarget: {
                                parentSourceKey: 'sites',
                                arrayFieldPath: 'items',
                                parentMatchField: 'code',
                                rowMatchField: 'parent_code',
                            },
                        },
                    ],
                },
            }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        try {
            await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
            await user.upload(
                screen.getByLabelText('Choose Excel workbook'),
                new File(['fixture'], 'array-composition.xlsx', {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
            )
            await screen.findByRole('checkbox', { name: 'Sites' })
            await user.click(screen.getByRole('button', { name: 'Add 2 selected sheets' }))
            await user.click(screen.getByRole('button', { name: 'Review mappings' }))
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))

            expect(await screen.findByText('1 valid · 0 invalid')).toBeTruthy()
            expect(screen.queryByRole('alert')).toBeNull()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

            await waitFor(() =>
                expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(false)
            )
            await user.click(screen.getByRole('button', { name: 'Use shared import flow' }))
            await user.click(screen.getByRole('radio', { name: 'Simplified' }))
            await user.click(await screen.findByRole('button', { name: 'Import' }))

            await waitFor(() =>
                expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
            )
            expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
                document: expect.objectContaining({
                    data: expect.objectContaining({
                        code: 'P-1',
                        items: [expect.objectContaining({ value: 'Item one' })],
                    }),
                }),
            }))
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            parseWorkbookSpy.mockRestore()
        }
    })

    it('resolves a workbook child sheet against an existing parent', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-workbook-parent-type',
            label: 'Workbook fixture parents',
            slug: 'workbook_fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-workbook-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'workbook_fixture_parent_default',
            label: 'Workbook fixture parent default',
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
            predicate: 'belongs_to',
            existingParentPolicy: 'lookup',
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            relationshipRules: [relationshipRule],
            sourceConfigs: [
                {
                    key: 'children',
                    label: 'Child rows',
                    fileName: 'Children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const parentDocument: IDocument = {
            uuid: 'workbook-existing-parent',
            slug: 'existing-workbook-parent',
            published: false,
            published_at: null,
            owner_sub: 'fixture-owner',
            lock_sub: null,
            locked_at: null,
            subs_for_select: [],
            roles_for_select: [],
            subs_for_update: [],
            roles_for_update: [],
            data: { code: 'P-1', name: 'Existing workbook parent' },
            attrs: { import: { source_id: 'existing-workbook-source', external_id: 'parent-1' } },
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: null,
            object_type_uuid: parentObjectType.uuid,
            label: 'Existing workbook parent',
            description: '',
        }
        const workbookText = 'id,value,parent_code\nchild-1,deep,P-1'
        const parseWorkbookSpy = vi.spyOn(workbookModule, 'parseWorkbookFile')
            .mockResolvedValue([{
                name: 'Children',
                text: workbookText,
                parsed: parseCSV(workbookText),
            }])
        const previousFetchImplementation = testPorts.fetchDocumentsByDataFieldValues.getMockImplementation()
        const lookupCallsBefore = testPorts.fetchDocumentsByDataFieldValues.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
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

        try {
            testPorts.fetchDocumentsByDataFieldValues.mockResolvedValue([parentDocument])
            await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
            await user.upload(
                screen.getByLabelText('Choose Excel workbook'),
                new File(['fixture'], 'external-parent.xlsx', {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
            )
            await screen.findByRole('checkbox', { name: 'Children' })
            await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))
            await user.click(screen.getByRole('button', { name: 'Review mappings' }))
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))

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
            await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

            await user.click(sharedFlowButton)
            await user.click(screen.getByRole('button', { name: 'Discover selected' }))
            await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
            await user.click(await screen.findByRole('button', { name: 'Execute import' }))
            await waitFor(() => {
                expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
                expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore + 1)
            })
            expect(testPorts.postRelationship).toHaveBeenLastCalledWith(expect.objectContaining({
                relationship: expect.objectContaining({
                    from_document_uuid: 'fixture-imported-document',
                    to_document_uuid: parentDocument.uuid,
                }),
            }))
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        } finally {
            parseWorkbookSpy.mockRestore()
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('keeps a workbook child sheet unresolved when no existing parent matches', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-workbook-missing-parent-type',
            label: 'Workbook fixture parents',
            slug: 'workbook_fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-workbook-missing-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'workbook_fixture_parent_default',
            label: 'Workbook fixture parent default',
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
                    label: 'Child rows',
                    fileName: 'Children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const workbookText = 'id,value,parent_code\nchild-1,deep,P-missing'
        const parseWorkbookSpy = vi.spyOn(workbookModule, 'parseWorkbookFile')
            .mockResolvedValue([{
                name: 'Children',
                text: workbookText,
                parsed: parseCSV(workbookText),
            }])
        const previousFetchImplementation = testPorts.fetchDocumentsByDataFieldValues.getMockImplementation()
        const lookupCallsBefore = testPorts.fetchDocumentsByDataFieldValues.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
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

        try {
            testPorts.fetchDocumentsByDataFieldValues.mockResolvedValue([])
            await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
            await user.upload(
                screen.getByLabelText('Choose Excel workbook'),
                new File(['fixture'], 'external-parent-missing.xlsx', {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
            )
            await screen.findByRole('checkbox', { name: 'Children' })
            await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))
            await user.click(screen.getByRole('button', { name: 'Review mappings' }))
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))

            const relationshipReview = await screen.findByRole('region', { name: 'CSV relationship review' })
            await waitFor(() => {
                expect(within(relationshipReview).getByText('0 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
                expect(testPorts.fetchDocumentsByDataFieldValues.mock.calls.length).toBeGreaterThan(lookupCallsBefore)
            })
            expect(testPorts.fetchDocumentsByDataFieldValues).toHaveBeenCalledWith(expect.objectContaining({
                objectTypeUuid: parentObjectType.uuid,
                fieldPath: 'code',
                values: ['P-missing'],
                token: 'test-token',
                signal: expect.any(AbortSignal),
            }))
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(true)
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            parseWorkbookSpy.mockRestore()
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('requires a parent choice for an ambiguous workbook child sheet match', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-workbook-ambiguous-parent-type',
            label: 'Workbook fixture parents',
            slug: 'workbook_fixture_parent',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-workbook-ambiguous-parent-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'workbook_fixture_parent_default',
            label: 'Workbook fixture parent default',
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
            predicate: 'belongs_to',
            existingParentPolicy: 'lookup',
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            relationshipRules: [relationshipRule],
            sourceConfigs: [
                {
                    key: 'children',
                    label: 'Child rows',
                    fileName: 'Children.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
            ],
        }
        const parentDocuments: IDocument[] = [
            {
                uuid: 'workbook-existing-parent-1',
                slug: 'workbook-parent-1',
                published: false,
                published_at: null,
                owner_sub: 'fixture-owner',
                lock_sub: null,
                locked_at: null,
                subs_for_select: [],
                roles_for_select: [],
                subs_for_update: [],
                roles_for_update: [],
                data: { code: 'P-1', name: 'Existing workbook parent one' },
                attrs: { import: { source_id: 'existing-workbook-source-1', external_id: 'parent-1' } },
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: null,
                object_type_uuid: parentObjectType.uuid,
                label: 'Existing workbook parent one',
                description: '',
            },
            {
                uuid: 'workbook-existing-parent-2',
                slug: 'workbook-parent-2',
                published: false,
                published_at: null,
                owner_sub: 'fixture-owner',
                lock_sub: null,
                locked_at: null,
                subs_for_select: [],
                roles_for_select: [],
                subs_for_update: [],
                roles_for_update: [],
                data: { code: 'P-1', name: 'Existing workbook parent two' },
                attrs: { import: { source_id: 'existing-workbook-source-2', external_id: 'parent-2' } },
                created_at: '2026-01-02T00:00:00.000Z',
                updated_at: null,
                object_type_uuid: parentObjectType.uuid,
                label: 'Existing workbook parent two',
                description: '',
            },
        ]
        const workbookText = 'id,value,parent_code\nchild-1,deep,P-1'
        const parseWorkbookSpy = vi.spyOn(workbookModule, 'parseWorkbookFile')
            .mockResolvedValue([{
                name: 'Children',
                text: workbookText,
                parsed: parseCSV(workbookText),
            }])
        const previousFetchImplementation = testPorts.fetchDocumentsByDataFieldValues.getMockImplementation()
        const lookupCallsBefore = testPorts.fetchDocumentsByDataFieldValues.mock.calls.length
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length
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

        try {
            testPorts.fetchDocumentsByDataFieldValues.mockResolvedValue(parentDocuments)
            await user.click(screen.getByRole('button', { name: 'Excel workbook (.xlsx)' }))
            await user.upload(
                screen.getByLabelText('Choose Excel workbook'),
                new File(['fixture'], 'external-parent-ambiguous.xlsx', {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
            )
            await screen.findByRole('checkbox', { name: 'Children' })
            await user.click(screen.getByRole('button', { name: 'Add 1 selected sheets' }))
            await user.click(screen.getByRole('button', { name: 'Review mappings' }))
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))

            const relationshipReview = await screen.findByRole('region', { name: 'CSV relationship review' })
            await waitFor(() => {
                expect(within(relationshipReview).getByText('0 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
                expect(within(relationshipReview).getByText('2 existing parent matches')).toBeTruthy()
                expect(testPorts.fetchDocumentsByDataFieldValues.mock.calls.length).toBeGreaterThan(lookupCallsBefore)
            })
            expect(testPorts.fetchDocumentsByDataFieldValues).toHaveBeenCalledWith(expect.objectContaining({
                objectTypeUuid: parentObjectType.uuid,
                fieldPath: 'code',
                values: ['P-1'],
                token: 'test-token',
                signal: expect.any(AbortSignal),
            }))

            const parentChoice = screen.getByLabelText(/Choose parent for /) as HTMLSelectElement
            expect(parentChoice.value).toBe('')
            expect(Array.from(parentChoice.options).map((option) => option.textContent)).toEqual([
                'Choose matching parent',
                'Existing workbook parent one (workbook-parent-1)',
                'Existing workbook parent two (workbook-parent-2)',
            ])
            expect((screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement).disabled).toBe(true)
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

            await user.selectOptions(parentChoice, 'workbook-existing-parent-1')
            await waitFor(() => {
                expect(within(relationshipReview).getByText('1 ready')).toBeTruthy()
                expect(within(relationshipReview).getByText('0 need resolution')).toBeTruthy()
            })
            expect(screen.queryByLabelText(/Choose parent for /)).toBeNull()
            expect((within(relationshipReview).getByRole('button', { name: 'Link relationships' }) as HTMLButtonElement).disabled).toBe(true)
            const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
            await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)

            await user.click(sharedFlowButton)
            await user.click(screen.getByRole('button', { name: 'Discover selected' }))
            await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
            await user.click(await screen.findByRole('button', { name: 'Execute import' }))
            await waitFor(() => {
                expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
                expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore + 1)
            })
            expect(testPorts.postRelationship).toHaveBeenLastCalledWith(expect.objectContaining({
                relationship: expect.objectContaining({
                    from_document_uuid: 'fixture-imported-document',
                    to_document_uuid: 'workbook-existing-parent-1',
                }),
            }))
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        } finally {
            parseWorkbookSpy.mockRestore()
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
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

    it('imports configured parent and child CSV sources through the shared controller', async () => {
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
            predicate: 'belongs_to',
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
            ['id,value,parent_code\nchild-1,deep,P-1\nchild-2,ignored,P-missing'],
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
        expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
        await user.click(within(relationshipReview).getByRole('button', { name: 'Ignore child row' }))
        expect(within(relationshipReview).getByText('1 rows ignored')).toBeTruthy()
        expect(within(relationshipReview).getByText('0 need resolution')).toBeTruthy()
        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
        await waitFor(() => {
            expect((screen.getByRole('button', { name: 'Import 2 records' }) as HTMLButtonElement).disabled).toBe(false)
        })
        expect(screen.getByRole('button', { name: 'Link relationships' })).toBeTruthy()

        await user.click(sharedFlowButton)
        await user.click(screen.getByRole('button', { name: 'Discover selected' }))
        await user.click(await screen.findByRole('button', { name: 'Prepare review' }))
        await user.click(await screen.findByRole('button', { name: 'Execute import' }))

        await waitFor(() => {
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 2)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore + 1)
        })
        const importedValues = testPorts.postDocument.mock.calls
            .slice(postDocumentCallsBefore)
            .map(([call]) => JSON.stringify(call.document.data))
        expect(importedValues.some((value) => value.includes('deep'))).toBe(true)
        expect(importedValues.some((value) => value.includes('ignored'))).toBe(false)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
    })

    it('imports a composite file session with linked documents and multiple array sources through the shared controller', async () => {
        const fixture = createCSVMappingFixture()
        const childObjectType = fixture.contextState.object_type[0]
        const parentObjectType: IObjectType = {
            ...childObjectType,
            uuid: 'fixture-project-type',
            label: 'Fixture projects',
            slug: 'fixture_project',
        }
        const parentSchema: IObjectSchema = {
            ...fixture.contextState.object_schema[0],
            uuid: 'fixture-project-schema',
            object_type_uuid: parentObjectType.uuid,
            slug: 'fixture_project_default',
            label: 'Fixture project default',
            json_schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string' }, name: { type: 'string' } },
            },
        }
        const relationshipRule: ImportRelationshipRule = {
            parentObjectTypeSlug: parentObjectType.slug,
            childObjectTypeSlug: childObjectType.slug,
            parentMatchField: 'code',
            childMatchField: 'parent_code',
            predicate: 'belongs_to',
        }
        const viewConfig: CSVImportViewConfig = {
            mapping: 'assumed',
            relationships: 'fixed',
            relationshipRules: [relationshipRule],
            sourceConfigs: [
                {
                    key: 'projects',
                    label: 'Projects',
                    fileName: 'projects.csv',
                    typeSlug: parentObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'parent',
                },
                {
                    key: 'deployments',
                    label: 'Deployments',
                    fileName: 'deployments.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'child',
                    relationshipFields: ['parent_code'],
                },
                {
                    key: 'recordings',
                    label: 'Recording items',
                    fileName: 'recordings.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'array',
                    relationshipFields: ['deployment'],
                    arrayTarget: {
                        parentSourceKey: 'deployments',
                        arrayFieldPath: 'recordings',
                        parentMatchField: 'deployment',
                        rowMatchField: 'deployment',
                    },
                },
                {
                    key: 'analyses',
                    label: 'Analysis items',
                    fileName: 'analyses.csv',
                    typeSlug: childObjectType.slug,
                    typeKnown: true,
                    mapping: 'assumed',
                    role: 'array',
                    relationshipFields: ['deployment'],
                    arrayTarget: {
                        parentSourceKey: 'deployments',
                        arrayFieldPath: 'analyses',
                        parentMatchField: 'deployment',
                        rowMatchField: 'deployment',
                    },
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
                    deployment: { type: 'string' },
                    recordings: {
                        type: 'array',
                        items: { type: 'object', required: ['value'], properties: { value: { type: 'string' } } },
                    },
                    analyses: {
                        type: 'array',
                        items: { type: 'object', required: ['value'], properties: { value: { type: 'string' } } },
                    },
                },
            },
            {
                viewConfig,
                additionalObjectTypes: [parentObjectType],
                additionalSchemas: [parentSchema],
            }
        )
        const files = [
            ['Projects', 'projects.csv', 'code,name\nP-1,Project one'],
            ['Deployments', 'deployments.csv', 'id,value,parent_code,deployment\nd-1,Deployment one,P-1,D-1'],
            ['Recording items', 'recordings.csv', 'deployment,value\nD-1,Recording one'],
            ['Analysis items', 'analyses.csv', 'deployment,value\nD-1,Analysis one'],
        ] as const
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        for (const [sourceLabel, fileName, contents] of files) {
            const sourceRegion = screen.getByRole('region', { name: sourceLabel })
            await user.upload(
                within(sourceRegion).getByLabelText(/Browse Files/),
                new File([contents], fileName, { type: 'text/csv' })
            )
            expect(await screen.findByText(`Using ${fileName} for this source.`)).toBeTruthy()
        }

        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)
        await screen.findByText('4 sources loaded')
        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
        await user.click(sharedFlowButton)
        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(await screen.findByRole('button', { name: 'Import' }))

        await waitFor(() => {
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 2)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore + 1)
        })
        const importedPayloads = testPorts.postDocument.mock.calls
            .slice(postDocumentCallsBefore)
            .map(([call]) => call.document.data as Record<string, unknown>)
        expect(importedPayloads).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'P-1', name: 'Project one' }),
            expect.objectContaining({
                value: 'Deployment one',
                recordings: [expect.objectContaining({ value: 'Recording one' })],
                analyses: [expect.objectContaining({ value: 'Analysis one' })],
            }),
        ]))
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
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
            await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
            await waitFor(() => {
                expect((screen.getByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement).disabled).toBe(false)
            })

            await user.click(sharedFlowButton)
            expect(await screen.findByRole('heading', { name: 'Import mapped CSV sources' })).toBeTruthy()
            expect(screen.getByRole('button', { name: 'Discover selected' })).toBeTruthy()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('blocks shared handoff for an unresolved parent row', async () => {
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
            ['id,value,parent_code\nchild-1,deep,P-missing'],
            'children.csv',
            { type: 'text/csv' }
        )
        const postDocumentCallsBefore = testPorts.postDocument.mock.calls.length
        const patchDocumentCallsBefore = testPorts.patchDocument.mock.calls.length
        const relationshipCallsBefore = testPorts.postRelationship.mock.calls.length

        await user.click(screen.getByRole('button', { name: 'CSV files' }))
        await user.upload(
            within(screen.getByRole('region', { name: 'Child CSV' })).getByLabelText(/Browse Files/),
            childFile
        )
        expect(await screen.findByText('Using children.csv for this source.')).toBeTruthy()

        const prepareButton = await screen.findByRole('button', { name: 'Prepare import' }) as HTMLButtonElement
        await waitFor(() => expect(prepareButton.disabled).toBe(false))
        await user.click(prepareButton)

        const relationshipReview = screen.getByRole('region', { name: 'CSV relationship review' })
        expect(within(relationshipReview).getByText('0 ready')).toBeTruthy()
        expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
        const sharedFlowButton = screen.getByRole('button', { name: 'Use shared import flow' }) as HTMLButtonElement
        expect(sharedFlowButton.disabled).toBe(true)
        expect(screen.getByText(
            'Complete required mappings, validation, and duplicate review in CSV before using the shared workflow.'
        )).toBeTruthy()
        expect(within(relationshipReview).getByRole('button', { name: 'Add parent source' })).toBeTruthy()

        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
    })

    it('ignores and restores an unresolved parent row', async () => {
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
            ['id,value,parent_code\nchild-1,deep,P-missing'],
            'children.csv',
            { type: 'text/csv' }
        )

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
        const ignoreButton = await within(relationshipReview).findByRole('button', { name: 'Ignore child row' })
        const documentWritesBefore = testPorts.postDocument.mock.calls.length
        const patchWritesBefore = testPorts.patchDocument.mock.calls.length
        const relationshipWritesBefore = testPorts.postRelationship.mock.calls.length
        await user.click(ignoreButton)

        expect(within(relationshipReview).getByText('1 rows ignored')).toBeTruthy()
        expect(within(relationshipReview).queryByRole('button', { name: 'Ignore child row' })).toBeNull()
        expect(within(relationshipReview).getByRole('button', { name: 'Restore ignored rows' })).toBeTruthy()

        await user.click(within(relationshipReview).getByRole('button', { name: 'Restore ignored rows' }))

        expect(within(relationshipReview).getByText('1 need resolution')).toBeTruthy()
        expect(within(relationshipReview).getByRole('button', { name: 'Ignore child row' })).toBeTruthy()
        expect(within(relationshipReview).queryByRole('button', { name: 'Restore ignored rows' })).toBeNull()
        expect(testPorts.postDocument).toHaveBeenCalledTimes(documentWritesBefore)
        expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchWritesBefore)
        expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipWritesBefore)
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
            expect(
                Array.from((screen.getByLabelText('Parent match field') as HTMLSelectElement).options)
                    .map((option) => option.value)
            ).toEqual(expect.arrayContaining(['uuid', 'slug', 'label', 'code', 'name']))
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
                'Complete required mappings, validation, and duplicate review in CSV before using the shared workflow.'
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
            await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
            await user.click(sharedFlowButton)
            expect(await screen.findByRole('heading', { name: 'Import mapped CSV sources' })).toBeTruthy()
            expect(screen.getByRole('button', { name: 'Discover selected' })).toBeTruthy()
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore)
            expect(testPorts.patchDocument).toHaveBeenCalledTimes(patchDocumentCallsBefore)
            expect(testPorts.postRelationship).toHaveBeenCalledTimes(relationshipCallsBefore)
        } finally {
            if (previousFetchImplementation) {
                testPorts.fetchDocumentsByDataFieldValues.mockImplementation(previousFetchImplementation)
            }
        }
    })

    it('imports configured CSV array sources through the shared controller', async () => {
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
    await waitFor(() => expect(sharedFlowButton.disabled).toBe(false))
        await waitFor(() => {
            const legacyImportButton = screen.getByRole('button', { name: 'Import 1 records' }) as HTMLButtonElement
            expect(legacyImportButton.disabled).toBe(false)
        })

        await user.click(sharedFlowButton)
        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(await screen.findByRole('button', { name: 'Import' }))
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )
        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                data: expect.objectContaining({
                    code: 'P-1',
                    items: [expect.objectContaining({ value: 'Item one' })],
                }),
            }),
        }))
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
        expect(recoveredSharedFlowButton.disabled).toBe(false)
        expect(screen.queryByRole('heading', { name: 'Import mapped CSV sources' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Discover selected' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Execute import' })).toBeNull()
        expect(testPorts.postDocument.mock.calls.length).toBe(postDocumentCallsBefore)
        expect(testPorts.patchDocument.mock.calls.length).toBe(patchDocumentCallsBefore)
        expect(testPorts.postRelationship.mock.calls.length).toBe(relationshipCallsBefore)

        await user.click(recoveredSharedFlowButton)
        await user.click(screen.getByRole('radio', { name: 'Simplified' }))
        await user.click(await screen.findByRole('button', { name: 'Import' }))
        await waitFor(() =>
            expect(testPorts.postDocument).toHaveBeenCalledTimes(postDocumentCallsBefore + 1)
        )
        expect(testPorts.postDocument).toHaveBeenLastCalledWith(expect.objectContaining({
            document: expect.objectContaining({
                data: expect.objectContaining({
                    code: 'P-1',
                    items: [expect.objectContaining({ value: 'Item corrected' })],
                }),
            }),
        }))
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
            expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))
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
            expect(await screen.findByRole('heading', { name: 'Map CSV fields' })).toBeTruthy()
            await user.click(screen.getByRole('button', { name: 'Continue to import' }))
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