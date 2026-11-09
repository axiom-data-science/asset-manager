import type { ReactElement } from 'react'
import { useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import type { CreateDocumentEntryProps } from '@/variants/types'
import { Link } from 'react-router-dom'
import PAMDocuments from './pam_documents'

const PAMEntry = ({
    returnToOnSuccess = '/create-document-success',
    documentCreatePath = '/create-document',
}: CreateDocumentEntryProps = {}): ReactElement => {
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        object_type_params: {
            filters: [{ column: 'slug', operator: 'eq', value: 'pam_project' }],
        },
    })
    const projectTypes = data?.object_types.filter(({ slug }) => slug === 'pam_project') ?? []
    const projectTypeUUIDs = new Set(projectTypes.map(({ uuid }) => uuid))
    const projectForms = data?.forms.filter((form) => projectTypeUUIDs.has(form.object_type_uuid)) ?? []

    return (
        <>
            <h2 className="text-2xl font-bold mb-4">PAM</h2>
            <div className="flex h-full flex-row gap-6">
                <section className="flex w-[40%] min-w-0 flex-col gap-4">
                    <h3 className="font-semibold">Create a project</h3>
                    {isLoading ? (
                        <p>Loading PAM project forms...</p>
                    ) : error ? (
                        <p role="alert">Unable to load PAM project forms: {error.message}</p>
                    ) : projectForms.length === 0 ? (
                        <p>No PAM project forms are available.</p>
                    ) : (
                        <div className="flex flex-row flex-wrap gap-3">
                            {projectForms.map((form) => (
                                <Link
                                    key={form.uuid}
                                    to={{
                                        pathname: `${documentCreatePath.replace(/\/$/, '')}/${form.object_type_uuid}/object_type/${form.uuid}/form`,
                                        search: new URLSearchParams({ returnToOnSuccess }).toString(),
                                    }}
                                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                                >
                                    {projectForms.length > 1 ? form.label : 'Create a PAM project'}
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
                <section className="flex min-w-0 flex-1 flex-col gap-4">
                    <h3 className="font-semibold">Projects</h3>
                    <PAMDocuments
                        returnToOnSuccess={returnToOnSuccess}
                        documentCreatePath={documentCreatePath}
                    />
                </section>
            </div>
        </>
    )
}
export default PAMEntry
