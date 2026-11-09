import { useDocumentAndObjectTypeAndObjectTypeConfig } from '@/manage/document/useDocument'
import type { ICreateDocumentSuccessProps } from '@/manage/document/create_success'
import type { IDocument } from '@/types/types'
import type { ReactElement } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useObjectTypeList, useObjectTypesAndFormsAndSchemas } from '@/manage/object_type/useObjectTypeList'
import { fetchObjectTypes } from '@/manage/object_type/services'
import Link from '@/manage/components/link'
import { fetchDocumentWithPermissions } from '@/manage/document/services'
import { fetchRelationships } from '@/manage/relationship/services'
import { useAuth } from '@/auth/useAuth'
import contextStateAtom from '@/state/contextStateAtom'
import { useQuery } from '@tanstack/react-query'
import { useAtom } from 'jotai'
import { utils } from '@axdspub/axiom-ui-utilities'

type PAMParentChainProps = {
    document: IDocument<unknown>
    objectTypeSlug: string
}

const PAMParentChain = ({ document, objectTypeSlug }: PAMParentChainProps): ReactElement | null => {
    const auth = useAuth()
    const [context] = useAtom(contextStateAtom)
    const {
        data: objectTypes,
        isLoading: isLoadingObjectTypes,
        error: objectTypesError,
    } = useObjectTypeList({
        params: {
            filters: [{
                column: 'slug',
                operator: 'in',
                value: ['pam_project', 'pam_site'],
            }],
        },
    })
    const predicate = context.predicate_by_predicate.has_parent
    const projectType = objectTypes?.find(({ slug }) => slug === 'pam_project')
    const siteType = objectTypes?.find(({ slug }) => slug === 'pam_site')
    const shouldLoadParentChain = objectTypeSlug === 'pam_site' || objectTypeSlug === 'pam_deployment'

    const { data: parents, isLoading, error } = useQuery({
        queryKey: ['pam-parent-chain', document.uuid, predicate?.uuid],
        enabled: shouldLoadParentChain && !!predicate && !!projectType && !!siteType,
        queryFn: async ({ signal }): Promise<IDocument<unknown>[]> => {
            if (!predicate || !projectType || !siteType) {
                throw new Error('PAM parent hierarchy is not available')
            }

            const token = auth.user?.access_token ?? ''
            const parentRelationships = await fetchRelationships({
                params: {
                    filters: [
                        { column: 'from_document_uuid', operator: 'eq', value: document.uuid },
                        { column: 'predicate_uuid', operator: 'eq', value: predicate.uuid },
                    ],
                    limit: 20,
                },
                token,
                signal,
            })
            const parentUUIDs = [...new Set(parentRelationships.map(({ to_document_uuid }) => to_document_uuid))]
            const directParents = parentUUIDs.length > 0
                ? await fetchDocumentWithPermissions({
                    params: {
                        filters: [{ column: 'uuid', operator: 'in', value: parentUUIDs }],
                        limit: 20,
                    },
                    token,
                    signal,
                })
                : []

            if (objectTypeSlug === 'pam_site') {
                return directParents
                    .filter(({ object_type_uuid }) => object_type_uuid === projectType.uuid)
            }

            const sites = directParents.filter(({ object_type_uuid }) => object_type_uuid === siteType.uuid)
            const projectRelationships = sites.length > 0
                ? await fetchRelationships({
                    params: {
                        filters: [
                            { column: 'from_document_uuid', operator: 'in', value: sites.map(({ uuid }) => uuid) },
                            { column: 'predicate_uuid', operator: 'eq', value: predicate.uuid },
                        ],
                        limit: 20,
                    },
                    token,
                    signal,
                })
                : []
            const projectUUIDs = [...new Set(projectRelationships.map(({ to_document_uuid }) => to_document_uuid))]
            const projects = projectUUIDs.length > 0
                ? await fetchDocumentWithPermissions({
                    params: {
                        filters: [
                            { column: 'uuid', operator: 'in', value: projectUUIDs },
                            { column: 'object_type_uuid', operator: 'eq', value: projectType.uuid },
                        ],
                        limit: 20,
                    },
                    token,
                    signal,
                })
                : []

            return [...projects, ...sites]
        },
    })

    if (!shouldLoadParentChain) {
        return null
    }

    if (isLoadingObjectTypes || (predicate && projectType && siteType && isLoading)) {
        return <p>Loading parent records...</p>
    }

    const queryError = objectTypesError ?? error
    if (queryError) {
        return <p role="alert">Unable to load PAM parent records: {queryError.message}</p>
    }

    if (!predicate || !projectType || !siteType) {
        return <p role="alert">PAM parent hierarchy is not available.</p>
    }

    if (!parents || parents.length === 0) {
        return <p>No parent records are linked to this document.</p>
    }

    return (
        <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Parent records</h2>
            <ol className="flex flex-col gap-1">
                {parents.map((parent) => (
                    <li key={parent.uuid}>
                        <span className="mr-2 text-sm text-slate-600">
                            {parent.object_type_uuid === projectType.uuid ? 'Project:' : 'Site:'}
                        </span>
                        <Link to={`/edit-document/${parent.uuid}`}>{parent.label}</Link>
                    </li>
                ))}
            </ol>
        </section>
    )
}

const PAMCreateChildPrompt = ({
    parentDocument,
    childTypeSlug,
    label,
}: {
    parentDocument: IDocument<unknown>
    childTypeSlug: string
    label: string
}): ReactElement => {
    const auth = useAuth()
    const { data: childTypes, isLoading, error } = useQuery({
        queryKey: ['pam-next-step-child-types', childTypeSlug],
        queryFn: ({ signal }) => fetchObjectTypes({
            params: {
                filters: [{ column: 'slug', operator: 'eq', value: childTypeSlug }],
            },
            token: auth.user?.access_token ?? '',
            signal,
        }),
    })
    const availableChildTypes = childTypes ?? []

    return (
        <section className="flex flex-col items-start gap-2">
            <h2 className="font-semibold">Next step: create a {label}</h2>
            {isLoading ? (
                <p>Loading {label} types...</p>
            ) : error ? (
                <p role="alert">Unable to load {label} types: {error.message}</p>
            ) : availableChildTypes.length === 0 ? (
                <p>No {label} types are available.</p>
            ) : (
                <div className="flex flex-row flex-wrap gap-3">
                    {availableChildTypes.map((childType) => (
                        <Link
                            key={childType.uuid}
                            to={`/create-document/${childType.uuid}/object_type?${new URLSearchParams({
                                    parentDocumentUUID: parentDocument.uuid,
                                    toParentPredicate: 'has_parent',
                                    parentObjectTypeUUID: parentDocument.object_type_uuid,
                                    returnToOnSuccess: '/create-document-success',
                                }).toString()}`}
                            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                        >
                            Create {childType.label}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}

const PAMCreateAnotherDocument = ({
    objectTypeUUID,
    objectTypeLabel,
    objectTypeSlug,
    document,
}: {
    objectTypeUUID: string
    objectTypeLabel: string
    objectTypeSlug: string
    document: IDocument<unknown>
}): ReactElement => {
    const auth = useAuth()
    const [context] = useAtom(contextStateAtom)
    const parentPredicate = context.predicate_by_predicate.has_parent
    const needsParent = objectTypeSlug === 'pam_site' || objectTypeSlug === 'pam_deployment'
    const parentTypeLabel = objectTypeSlug === 'pam_deployment' ? 'site' : 'project'
    const parentTypeSlug = objectTypeSlug === 'pam_deployment' ? 'pam_site' : 'pam_project'
    const {
        data: parentDocument,
        isLoading: isLoadingParent,
        error: parentError,
        isSuccess: parentLookupComplete,
    } = useQuery({
        queryKey: ['pam-create-another-parent', document.uuid, parentPredicate?.uuid, parentTypeSlug],
        enabled: needsParent && !!parentPredicate,
        queryFn: async ({ signal }): Promise<IDocument<unknown> | null> => {
            if (!parentPredicate) {
                throw new Error('PAM parent relationship predicate is not available')
            }

            const token = auth.user?.access_token ?? ''
            const parentTypes = await fetchObjectTypes({
                params: {
                    filters: [{ column: 'slug', operator: 'eq', value: parentTypeSlug }],
                },
                token,
                signal,
            })
            if (parentTypes.length === 0) {
                throw new Error(`PAM ${parentTypeLabel} type is not available`)
            }
            const parentTypeUUIDs = new Set(parentTypes.map(({ uuid }) => uuid))

            const relationships = await fetchRelationships({
                params: {
                    filters: [
                        { column: 'from_document_uuid', operator: 'eq', value: document.uuid },
                        { column: 'predicate_uuid', operator: 'eq', value: parentPredicate.uuid },
                    ],
                    limit: 20,
                },
                token,
                signal,
            })
            const parentUUIDs = [...new Set(relationships.map(({ to_document_uuid }) => to_document_uuid))]
            if (parentUUIDs.length === 0) {
                return null
            }

            const parents = await fetchDocumentWithPermissions({
                params: {
                    filters: [{ column: 'uuid', operator: 'in', value: parentUUIDs }],
                    limit: 20,
                },
                token,
                signal,
            })
            return parents.find(({ object_type_uuid }) => parentTypeUUIDs.has(object_type_uuid)) ?? null
        },
    })
    const { data, isLoading, error } = useObjectTypesAndFormsAndSchemas({
        object_type_params: {
            filters: [{ column: 'uuid', operator: 'eq', value: objectTypeUUID }],
        },
        form_params: {
            filters: [{ column: 'object_type_uuid', operator: 'eq', value: objectTypeUUID }],
        },
    })
    const forms = data?.forms.filter((form) => form.object_type_uuid === objectTypeUUID) ?? []
    const returnToOnSuccess = '/create-document-success'
    const buttonClassName = utils.createButtonClass({ size: 'md', variant: 'default' })
    const createAnotherPath = (formUUID?: string) => {
        const searchParams = new URLSearchParams({ returnToOnSuccess })
        if (parentDocument) {
            searchParams.set('parentDocumentUUID', parentDocument.uuid)
            searchParams.set('toParentPredicate', 'has_parent')
            searchParams.set('parentObjectTypeUUID', parentDocument.object_type_uuid)
        }
        const path = parentDocument || !formUUID
            ? `/create-document/${objectTypeUUID}/object_type`
            : `/create-document/${objectTypeUUID}/object_type/${formUUID}/form`
        return `${path}?${searchParams.toString()}`
    }

    return (
        <section className="flex flex-col items-start gap-2">
            <h2 className="font-semibold">Create another {objectTypeLabel}</h2>
            {needsParent && !parentPredicate ? (
                <p role="alert">PAM parent relationship predicate is not available.</p>
            ) : parentError ? (
                <p role="alert">Unable to load the parent {parentTypeLabel}: {parentError.message}</p>
            ) : needsParent && isLoadingParent ? (
                <p>Loading parent {parentTypeLabel}...</p>
            ) : needsParent && parentLookupComplete && !parentDocument ? (
                <p role="alert">No parent {parentTypeLabel} is linked to this document.</p>
            ) : isLoading ? (
                <p>Loading {objectTypeLabel} forms...</p>
            ) : error ? (
                <p role="alert">Unable to load {objectTypeLabel} forms: {error.message}</p>
            ) : forms.length ? (
                <div className="flex flex-row flex-wrap gap-3">
                    {forms.map((form) => (
                        <RouterLink
                            key={form.uuid}
                            to={createAnotherPath(form.uuid)}
                            className={buttonClassName}
                        >
                            Create another {objectTypeLabel}
                        </RouterLink>
                    ))}
                </div>
            ) : (
                <RouterLink
                    to={createAnotherPath()}
                    className={buttonClassName}
                >
                    Create another {objectTypeLabel}
                </RouterLink>
            )}
        </section>
    )
}

const PAMCreateDocumentSuccess = ({
    action = 'created',
}: ICreateDocumentSuccessProps = {}): ReactElement => {
    const [searchParams] = useSearchParams()
    const uuid = searchParams.get('uuid')
    const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid ?? '')
    const updated = action === 'updated' || searchParams.get('action') === 'edit'

    if (!uuid) {
        return <div>Invalid document ID</div>
    }

    if (isLoading) {
        return <p>Loading PAM document...</p>
    }

    if (error) {
        return <p role="alert">Unable to load PAM document: {error.message}</p>
    }

    if (!data?.document) {
        return <p>PAM document not found.</p>
    }

    const documentType = data.objectType.slug.replace(/^pam_/, '').replace(/_/g, ' ')

    return (
        <div className="flex flex-col gap-6 p-8">
            <h1 className="text-2xl font-medium">PAM {documentType} {updated ? 'updated' : 'created'}</h1>
            <div className="flex flex-wrap items-center gap-3">
                <Check className="text-green-600" size={24} />
                <Link to={`/edit-document/${uuid}`} className="font-bold">
                    {data.document.label}
                </Link>
                <span>{updated ? 'updated' : 'created'}</span>
            </div>
            <PAMParentChain document={data.document} objectTypeSlug={data.objectType.slug} />
            {!updated && data.objectType.slug === 'pam_project' && (
                <PAMCreateChildPrompt
                    parentDocument={data.document}
                    childTypeSlug="pam_site"
                    label="site"
                />
            )}
            {!updated && data.objectType.slug === 'pam_site' && (
                <PAMCreateChildPrompt
                    parentDocument={data.document}
                    childTypeSlug="pam_deployment"
                    label="deployment"
                />
            )}
            {!updated && (
                <PAMCreateAnotherDocument
                    objectTypeUUID={data.objectType.uuid}
                    objectTypeLabel={data.objectType.label}
                    objectTypeSlug={data.objectType.slug}
                    document={data.document}
                />
            )}
        </div>
    )
}

export default PAMCreateDocumentSuccess
