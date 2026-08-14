import { Loader } from '@axdspub/axiom-ui-utilities'
import { lazy, Suspense, type ReactElement } from 'react'

import type { IImportPageProps } from './import_records_page_impl.tsx'

const LazyImportRecordsPage = lazy(() => import('./import_records_page_impl.tsx'))

const ImportRecordsPage = (props: IImportPageProps): ReactElement => {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center p-6">
                    <Loader size="sm" />
                </div>
            }
        >
            <LazyImportRecordsPage {...props} />
        </Suspense>
    )
}

export default ImportRecordsPage
