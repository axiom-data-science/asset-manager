// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider, createStore } from 'jotai'
import { CSVMappingFixtureView } from '../testing/CSVMappingFixtureView'
import {
  createCSVMappingFixture,
  createCSVMappingWorkbookFile,
} from '../testing/csvMappingFixture'
import contextStateAtom from '@/state/contextStateAtom'

describe('CSV mapping editor fixture', () => {
  let blockedFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    blockedFetch = vi.fn(() => Promise.reject(new Error('Unexpected fetch in CSV mapping fixture test.')))
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
})