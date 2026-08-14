import { Loader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { lazy, Suspense, type ReactElement } from ***REMOVED***react***REMOVED***

import type { IImportPageProps } from ***REMOVED***./import_records_page_impl.tsx***REMOVED***

const LazyImportRecordsPage = lazy(() => import(***REMOVED***./import_records_page_impl.tsx***REMOVED***))

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
