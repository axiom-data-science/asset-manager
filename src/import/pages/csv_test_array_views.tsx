import CSVImportPage, { type CSVImportViewConfig } from './csv'

const parentSourceConfig = {
    key: 'test-array-parent',
    label: 'Parent records',
    description: 'Upload test-array-parent.csv with the parent code and name fields.',
    fileName: 'test-array-parent.csv',
    typeSlug: 'test_schema_with_array',
    typeKnown: true,
    mapping: 'assumed' as const,
}

const arraySourceConfig = {
    key: 'test-array-items',
    label: 'Contact array items',
    description: 'Upload test-array-items.csv. Each row becomes one contacts array item.',
    fileName: 'test-array-items.csv',
    typeSlug: 'test_schema_with_array',
    typeKnown: true,
    mapping: 'assumed' as const,
    arrayTarget: {
        parentSourceKey: 'test-array-parent',
        arrayFieldPath: 'contacts',
        parentMatchField: 'code',
        rowMatchField: 'parent_code',
    },
}

const testArrayViewConfig: CSVImportViewConfig = {
    mapping: 'assumed',
    relationships: 'fixed',
    sourceConfigs: [parentSourceConfig, arraySourceConfig],
}

export const CSVTestArray = () => <CSVImportPage viewConfig={testArrayViewConfig} />
