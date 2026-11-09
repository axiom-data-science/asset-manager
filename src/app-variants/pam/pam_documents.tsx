import { fetchDocumentWithPermissions } from '@/manage/document/services'
import { fetchRelationships } from '@/manage/relationship/services'
import { useObjectTypeList } from '@/manage/object_type/useObjectTypeList'
import { useAuth } from '@/auth/useAuth'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Link from '@/manage/components/link'
import contextStateAtom from '@/state/contextStateAtom'
import type { IDocument, IObjectType } from '@/types/types'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import type { ReactElement } from 'react'
import { useAtom } from 'jotai'
import type { CreateDocumentEntryProps } from '@/variants/types'

type PAMDocument = IDocument<unknown> & { can_modify: boolean }

type PAMRecords = {
    projects: PAMDocument[]
    sitesByProject: Record<string, PAMDocument[]>
    deploymentsBySite: Record<string, PAMDocument[]>
}

const fetchChildren = async ({
    parents,
    childType,
    predicateUUID,
    token,
    signal,
}: {
    parents: PAMDocument[]
    childType: IObjectType
    predicateUUID: string
    token: string
    signal: AbortSignal
}): Promise<Record<string, PAMDocument[]>> => {
    if (parents.length === 0) {
        return {}
    }

    const relationships = await fetchRelationships({
        params: {
            filters: [
                { column: 'to_document_uuid', operator: 'in', value: parents.map(({ uuid }) => uuid) },
                { column: 'predicate_uuid', operator: 'eq', value: predicateUUID },
            ],
            limit: 500,
        },
        token,
        signal,
    })
    const childUUIDs = [...new Set(relationships.map(({ from_document_uuid }) => from_document_uuid))]
    const children = childUUIDs.length > 0
        ? await fetchDocumentWithPermissions({
            params: {
                filters: [
                    { column: 'uuid', operator: 'in', value: childUUIDs },
                    { column: 'object_type_uuid', operator: 'eq', value: childType.uuid },
                ],
                order: [{ column: 'created_at', dir: 'desc' }],
                limit: 500,
            },
            token,
            signal,
        })
        : []
    const childrenByUUID = new Map(children.map((child) => [child.uuid, child]))

    return Object.fromEntries(
        parents.map((parent) => [
            parent.uuid,
            relationships
                .filter(({ to_document_uuid }) => to_document_uuid === parent.uuid)
                .map(({ from_document_uuid }) => childrenByUUID.get(from_document_uuid))
                .filter((child): child is PAMDocument => child !== undefined),
        ])
    )
}

const PAMCreateChildLink = ({
    parentDocument,
    childType,
    label,
    documentCreatePath,
    returnToOnSuccess,
}: {
    parentDocument: PAMDocument
    childType: IObjectType
    label: string
    documentCreatePath: string
    returnToOnSuccess: string
}): ReactElement => (
    <Link
        to={`${documentCreatePath.replace(/\/$/, '')}/${childType.uuid}/object_type?${new URLSearchParams({
            parentDocumentUUID: parentDocument.uuid,
            toParentPredicate: 'has_parent',
            parentObjectTypeUUID: parentDocument.object_type_uuid,
            returnToOnSuccess,
        }).toString()}`}
        className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
    >
        Create {label}
    </Link>
)

const PAMDocuments = ({
    returnToOnSuccess = '/create-document-success',
    documentCreatePath = '/create-document',
}: CreateDocumentEntryProps = {}): ReactElement => {
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
                value: ['pam_project', 'pam_site', 'pam_deployment'],
            }],
        },
    })
    const projectType = objectTypes?.find(({ slug }) => slug === 'pam_project')
    const siteType = objectTypes?.find(({ slug }) => slug === 'pam_site')
    const deploymentType = objectTypes?.find(({ slug }) => slug === 'pam_deployment')
    const hasParentPredicate = context.predicate_by_predicate.has_parent

    const { data, isLoading, error } = useQuery({
        queryKey: ['pam-records', projectType?.uuid, siteType?.uuid, deploymentType?.uuid, hasParentPredicate?.uuid],
        enabled: !!projectType && !!siteType && !!deploymentType && !!hasParentPredicate,
        queryFn: async ({ signal }): Promise<PAMRecords> => {
            if (!projectType || !siteType || !deploymentType || !hasParentPredicate) {
                throw new Error('PAM project hierarchy is not available')
            }

            const token = auth.user?.access_token ?? ''
            const projects = await fetchDocumentWithPermissions({
                params: {
                    filters: [{ column: 'object_type_uuid', operator: 'eq', value: projectType.uuid }],
                    order: [{ column: 'created_at', dir: 'desc' }],
                    limit: 500,
                },
                token,
                signal,
            })
            const sitesByProject = await fetchChildren({
                parents: projects,
                childType: siteType,
                predicateUUID: hasParentPredicate.uuid,
                token,
                signal,
            })
            const sites = Object.values(sitesByProject).flat()
            const deploymentsBySite = await fetchChildren({
                parents: sites,
                childType: deploymentType,
                predicateUUID: hasParentPredicate.uuid,
                token,
                signal,
            })

            return { projects, sitesByProject, deploymentsBySite }
        },
    })

    if (!isLoadingObjectTypes && !objectTypesError && (!projectType || !siteType || !deploymentType)) {
        return <p>PAM project, site, or deployment type is not available.</p>
    }

    if (!isLoadingObjectTypes && !objectTypesError && !hasParentPredicate) {
        return <p>The PAM parent relationship predicate is not available.</p>
    }

    if (isLoadingObjectTypes || (!!projectType && !!siteType && !!deploymentType && isLoading)) {
        return <p>Loading PAM projects...</p>
    }

    const queryError = objectTypesError ?? error
    if (queryError) {
        return <p role="alert">Unable to load PAM projects: {queryError.message}</p>
    }

    if (!data) {
        return <p>PAM project records are unavailable.</p>
    }

    return (
        <div className="flex flex-col gap-2">
            {data.projects.length === 0 ? (
                <p className="text-sm text-slate-600">No projects yet.</p>
            ) : data.projects.map((project) => (
                <Collapsible key={project.uuid}>
                    <section className="rounded-md bg-slate-100 p-3">
                        <div className="flex items-center gap-2">
                            <Link to={`/edit-document/${project.uuid}`} className="font-semibold">
                                {project.label}
                            </Link>
                            {siteType && (
                                <PAMCreateChildLink
                                    parentDocument={project}
                                    childType={siteType}
                                    label="site"
                                    documentCreatePath={documentCreatePath}
                                    returnToOnSuccess={returnToOnSuccess}
                                />
                            )}
                            <CollapsibleTrigger
                                aria-label={`Show sites for ${project.label}`}
                                className="ml-auto rounded p-1 hover:bg-slate-200"
                            >
                                <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                            <div className="mt-3 flex flex-col gap-2 border-l pl-3">
                                {(data.sitesByProject[project.uuid] ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-600">No sites yet.</p>
                                ) : (data.sitesByProject[project.uuid] ?? []).map((site) => (
                                    <Collapsible key={site.uuid}>
                                        <div className="rounded bg-white p-2">
                                            <div className="flex items-center gap-2">
                                                <Link to={`/edit-document/${site.uuid}`} className="text-sm font-medium">
                                                    {site.label}
                                                </Link>
                                                {deploymentType && (
                                                    <PAMCreateChildLink
                                                        parentDocument={site}
                                                        childType={deploymentType}
                                                        label="deployment"
                                                        documentCreatePath={documentCreatePath}
                                                        returnToOnSuccess={returnToOnSuccess}
                                                    />
                                                )}
                                                <CollapsibleTrigger
                                                    aria-label={`Show deployments for ${site.label}`}
                                                    className="ml-auto rounded p-1 hover:bg-slate-100"
                                                >
                                                    <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
                                                </CollapsibleTrigger>
                                            </div>
                                            <CollapsibleContent>
                                                <div className="mt-2 border-l pl-3">
                                                    {(data.deploymentsBySite[site.uuid] ?? []).length === 0 ? (
                                                        <p className="text-sm text-slate-600">No deployments yet.</p>
                                                    ) : (
                                                        <ul className="flex flex-col gap-1">
                                                            {(data.deploymentsBySite[site.uuid] ?? []).map((deployment) => (
                                                                <li key={deployment.uuid}>
                                                                    <Link to={`/edit-document/${deployment.uuid}`} className="text-sm">
                                                                        {deployment.label}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>
            ))}
        </div>
    )
}

export default PAMDocuments
