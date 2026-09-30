import { describe, expect, it } from 'vitest'
import { updateCSVImportSource } from './csv_import_source_state'

describe('CSV import source state', () => {
    it('updates one file mapping without changing another source or the prior state', () => {
        const first = {
            sourceId: 'nested-source',
            mapping: { label: 'station_name', dataColumns: ['owner_name'] },
        }
        const second = {
            sourceId: 'array-source',
            mapping: { label: 'station_label', dataColumns: ['header_data_type'] },
        }
        const sources = [first, second]

        const updated = updateCSVImportSource(sources, 'nested-source', {
            mapping: { ...first.mapping, dataColumns: ['owner_name', 'sample_file_uri'] },
        })

        expect(updated[0].mapping.dataColumns).toEqual(['owner_name', 'sample_file_uri'])
        expect(updated[1]).toBe(second)
        expect(sources[0].mapping.dataColumns).toEqual(['owner_name'])
    })
})