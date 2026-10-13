import { createRoot } from 'react-dom/client'
import { Provider, createStore } from 'jotai'
import { MemoryRouter } from 'react-router-dom'
import contextStateAtom from '@/state/contextStateAtom'
import { uploadedImportSourcesAtom } from '@/import/state/uploadedImportSources'
import { ImportAllView } from '@/import/pages/all'
import { createImportAllFixtureRuntime } from './fixtureRuntime'
import { CSVMappingFixtureView } from '@/import/testing/CSVMappingFixtureView'
import { createCSVMappingFixture, csvMappingWorkbookUrl } from './csvMappingFixture'
import { ERDDAPFixtureView } from './ERDDAPFixtureView'
import { createERDDAPFixtureRuntime } from './erddapFixture'
import '../../index.css'

if (!import.meta.env.DEV) {
    throw new Error('The Import All fixture harness is development-only.')
}

const fetchLocalAsset = window.fetch.bind(window)
const erddapFixture = createERDDAPFixtureRuntime()
window.fetch = async (input, init) => {
    const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        window.location.href
    )
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    if (url.href === csvMappingWorkbookUrl.href && method.toUpperCase() === 'GET') {
        return fetchLocalAsset(input, init)
    }
    return erddapFixture.fetch(input, init)
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing Import All fixture root element.')

const root = createRoot(rootElement)
const view = new URLSearchParams(window.location.search).get('view')
if (view === 'erddap') {
    root.render(<ERDDAPFixtureView />)
} else if (view === 'csv') {
    const fixture = createCSVMappingFixture()
    const store = createStore()
    store.set(contextStateAtom, fixture.contextState)
    root.render(
        <Provider store={store}>
            <CSVMappingFixtureView />
        </Provider>
    )
} else {
    const fixture = createImportAllFixtureRuntime({ omitChildType: true, failRelationshipOnce: true })
    const store = createStore()
    store.set(contextStateAtom, fixture.makeContextState())
    store.set(uploadedImportSourcesAtom, [])
    fixture.runtime.requestContextReload = () => {
        fixture.portCalls.contextReload += 1
        store.set(contextStateAtom, fixture.makeContextState())
    }

    // The manual type selector and form use auth-backed services; the fixture exposes only automatic in-memory type creation.
    root.render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/import-test']}>
                <ImportAllView
                    pageTitle="Import All fixture"
                    configuredSourceOverrides={fixture.sources}
                    token=""
                    canWrite
                    runtime={fixture.runtime}
                    includeUploadedSources={false}
                    allowManualTypeSetup={false}
                />
            </MemoryRouter>
        </Provider>
    )
}