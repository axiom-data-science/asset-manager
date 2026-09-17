import { useAuth } from '@/auth/useAuth'
import Link from '@/manage/components/link'
import Table from '@/manage/components/table'
import { deleteRelationship } from '@/manage/relationship/services'
import { relationshipListQueryKey, useRelationshipListWithRollupsAndLookups } from '@/manage/relationship/useRelationshipList'
import type { IPostgrestFilter, IPostgrestParams, IRelationship, IRollup } from '@/types/types'
import { useQueryClient } from '@tanstack/react-query'
import { Button, SelectInput, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { X } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'

const ALL_FILTER_VALUE = '__all__'

const DeleteButton = ({
    relationship,
    onDelete,
}: {
    relationship: IRelationship
    onDelete: () => void
}): ReactElement => {
    const [confirm, setConfirm] = useState(false)
    const auth = useAuth()

    const onClick = () => {
        if (!confirm) {
            setConfirm(true)
            return
        }
        deleteRelationship({
            uuid: relationship.uuid,
            token: auth.user?.access_token ?? '',
        }).then(() => {
            setConfirm(false)
            onDelete()
        })
    }

    return (
        <span className="flex flex-row items-center gap-2">
            <Button onClick={onClick} size="xs" type="alert" className="text-white">
                {confirm ? 'Confirm' : 'Delete'}
            </Button>
            {confirm && (
                <Button
                    onClick={() => setConfirm(false)}
                    size="xs"
                    variant="ghost"
                    type="secondary"
                    className="text-slate-600"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </span>
    )
}


const ListRelationships = (): ReactElement => {
    const auth = useAuth()
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()
    const filters: Record<string, string | undefined> = Object.fromEntries(
        Array.from(searchParams.entries())
    )

    const rollups = ['predicate_uuid']

    const filterKeys = new Set(rollups)
    const userFilters: IPostgrestFilter[] = Object.keys(filters)
        .filter((k) => filterKeys.has(k))
        .map((k) => ({
            column: k,
            operator: 'eq' as const,
            value: String(filters[k]),
        }))

    const params: IPostgrestParams = {
        order: [{ column: 'uuid', dir: 'desc' }],
        filters: userFilters,
    }

    const targetedParams: Record<string, IPostgrestParams> = {
        relationship: {
            order: [{ column: 'uuid', dir: 'desc' }],
        },
    }

    rollups.forEach((r) => {
        if (userFilters.find((f) => f.column === r)) {
            targetedParams[r] = {
                filters: userFilters.filter((f) => f.column !== r),
            }
        }
    })

    const { data, isLoading, error } = useRelationshipListWithRollupsAndLookups({
        params,
        targetedParams,
        rollups,
    })

    const onDelete = () => {
        queryClient.invalidateQueries({ queryKey: relationshipListQueryKey({}) })
    }

    if (!auth.user) {
        return (
            <div className="p-20">
                <p>You must be logged in to view relationships.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    const documentByUuid = Object.fromEntries((data?.documents ?? []).map((d) => [d.uuid, d.label]))
    const predicateByUuid = Object.fromEntries((data?.predicates ?? []).map((p) => [p.uuid, p]))

    const setFilter = (key: string, value?: string) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                if (value === undefined || value === '') {
                    next.delete(key)
                } else {
                    next.set(key, value)
                }
                return next
            },
            { replace: true }
        )
    }

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Relationships</h1>

            <div className="flex flex-row flex-wrap gap-4 p-2 sticky top-10 bg-white z-10">
                {Object.keys(data?.relationships.rollups ?? {}).map((rollupKey) => {
                    const rollup = (data?.relationships.rollups?.[rollupKey] ?? []).filter(
                        (item) => item.label !== null && item.label !== ''
                    ) as IRollup[]
                    if (rollup.length < 1) {
                        return null
                    }

                    const label = 'Predicate'

                    return (
                        <div className="flex flex-row gap-2 items-center" key={rollupKey}>
                            <span className="font-semibold">{label}</span>
                            <SelectInput
                                id={rollupKey}
                                testId={rollupKey}
                                label={null}
                                size="xs"
                                value={filters[rollupKey] ?? ALL_FILTER_VALUE}
                                options={[
                                    { label: `All ${label.toLowerCase()} values`, value: ALL_FILTER_VALUE },
                                    ...rollup.map((item) => {
                                        const mappedLabel = predicateByUuid[item.label]?.label ?? item.label
                                        return {
                                            label: `${mappedLabel} (${item.count})`,
                                            value: item.label,
                                        }
                                    }),
                                ]}
                                onChange={(value) =>
                                    setFilter(
                                        rollupKey,
                                        value && String(value) !== ALL_FILTER_VALUE ? String(value) : undefined
                                    )
                                }
                            />
                        </div>
                    )
                })}

                <Link
                    to="/relationship/create"
                    className={utils.createButtonClass({
                        size: 'sm',
                        type: 'create',
                    })}
                >
                    Create relationship
                </Link>
            </div>

            {data &&
                (data.relationships.items.length === 0 ? (
                    <div className="p-4">
                        <p>No relationships found.</p>
                    </div>
                ) : (
                    <Table
                        className="w-full"
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        tbodyClassName="text-sm"
                        data={data.relationships.items}
                        columns={[
                            {
                                label: 'UUID',
                                id: 'uuid',
                                accessor: (r) => <Link to={`/relationship/edit/${r.uuid}`}>{r.uuid}</Link>,
                            },
                            {
                                label: 'From document',
                                id: 'from_document_uuid',
                                accessor: (r) => (
                                    <Link to={`/document/edit/${r.from_document_uuid}`}>
                                        {documentByUuid[r.from_document_uuid] ?? r.from_document_uuid}
                                    </Link>
                                ),
                            },
                            {
                                label: 'Predicate',
                                id: 'predicate_uuid',
                                accessor: (r) => {
                                    const predicate = predicateByUuid[r.predicate_uuid]
                                    return <Link to={`/predicate/edit/${r.predicate_uuid}`}>{predicate ? `${predicate.label} (${predicate.predicate})` : r.predicate_uuid}</Link>
                                },
                            },
                            {
                                label: 'To document',
                                id: 'to_document_uuid',
                                accessor: (r) => (
                                    <Link to={`/document/edit/${r.to_document_uuid}`}>
                                        {documentByUuid[r.to_document_uuid] ?? r.to_document_uuid}
                                    </Link>
                                ),
                            },
                            {
                                label: 'Delete',
                                id: 'delete',
                                accessor: (r) => <DeleteButton relationship={r as IRelationship} onDelete={onDelete} />,
                            },
                        ]}
                    />
                ))}
        </ViewWithLoader>
    )
}

export default ListRelationships
