import { useAuth } from '@/auth/useAuth'
import Link from '@/manage/components/link'
import Table from '@/manage/components/table'
import { deletePredicate } from '@/manage/predicate/services'
import { predicateListQueryKey, usePredicateListWithRollups } from '@/manage/predicate/usePredicateList'
import type { IPostgrestFilter, IPostgrestParams, IPredicate, IRollup } from '@/types/types'
import { useQueryClient } from '@tanstack/react-query'
import { Button, SelectInput, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { X } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'

const ALL_FILTER_VALUE = '__all__'

type IPredicateWithRelationshipCount = IPredicate & {
    relationship_count?: { count: number }[]
}

const DeleteButton = ({
    predicate,
    relationshipCount,
    onDelete,
}: {
    predicate: IPredicate
    relationshipCount: number
    onDelete: () => void
}): ReactElement => {
    const [confirm, setConfirm] = useState(false)
    const auth = useAuth()

    const onClick = () => {
        if (!confirm) {
            setConfirm(true)
            return
        }
        deletePredicate({
            uuid: predicate.uuid,
            token: auth.user?.access_token ?? '',
        }).then(() => {
            setConfirm(false)
            onDelete()
        })
    }

    return (
        <span className="flex flex-col gap-2">
            {confirm && relationshipCount > 0 && (
                <span className="text-xs text-red-600">
                    This will also delete {relationshipCount} relationship{relationshipCount === 1 ? '' : 's'}
                </span>
            )}
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
        </span>
    )
}

const ListPredicates = (): ReactElement => {
    const auth = useAuth()
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()
    const filters: Record<string, string | undefined> = Object.fromEntries(
        Array.from(searchParams.entries())
    )

    const rollups = ['is_directional']
    const filterKeys = new Set(rollups)

    const userFilters: IPostgrestFilter[] = Object.keys(filters)
        .filter((k) => filterKeys.has(k))
        .map((k) => ({
            column: k,
            operator: 'eq' as const,
            value: String(filters[k]),
        }))

    const params: IPostgrestParams = {
        order: [{ column: 'label', dir: 'asc' }],
        select: ['*', 'relationship_count:relationship(count)'],
        filters: userFilters,
    }

    const targetedParams: Record<string, IPostgrestParams> = {
        predicate: {
            order: [{ column: 'label', dir: 'asc' }],
            select: ['*', 'relationship_count:relationship(count)'],
        },
    }

    rollups.forEach((r) => {
        if (userFilters.find((f) => f.column === r)) {
            targetedParams[r] = {
                filters: userFilters.filter((f) => f.column !== r),
            }
        }
    })

    const { data, isLoading, error } = usePredicateListWithRollups({
        params,
        targetedParams,
        rollups,
    })

    const onDelete = () => {
        queryClient.invalidateQueries({ queryKey: predicateListQueryKey({}) })
    }

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

    if (!auth.user) {
        return (
            <div className="p-20">
                <p>You must be logged in to view predicates.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Predicates</h1>

            <div className="flex flex-row flex-wrap gap-4 p-2 sticky top-10 bg-white z-10">
                {Object.keys(data?.rollups ?? {}).map((rollupKey) => {
                    const rollup = (data?.rollups?.[rollupKey] ?? []).filter(
                        (item) => item.label !== null && item.label !== ''
                    ) as IRollup[]
                    if (rollup.length < 1) {
                        return null
                    }

                    return (
                        <div className="flex flex-row gap-2 items-center" key={rollupKey}>
                            <span className="font-semibold">Direction</span>
                            <SelectInput
                                id={rollupKey}
                                testId={rollupKey}
                                label={null}
                                size="xs"
                                value={filters[rollupKey] ?? ALL_FILTER_VALUE}
                                options={[
                                    { label: 'All directions', value: ALL_FILTER_VALUE },
                                    ...rollup.map((item) => ({
                                        label: `${item.label === 'true' ? 'Directional' : 'Non-directional'} (${item.count})`,
                                        value: item.label,
                                    })),
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
                    to="/predicate/create"
                    className={utils.createButtonClass({
                        size: 'sm',
                        type: 'create',
                    })}
                >
                    Create predicate
                </Link>
            </div>

            {data &&
                (data.items.length === 0 ? (
                    <div className="p-4">
                        <p>No predicates found.</p>
                    </div>
                ) : (
                    <Table
                        className="w-full"
                        rowClassName="odd:bg-slate-100"
                        theadClassName="sticky top-26"
                        tbodyClassName="text-sm"
                        data={data.items}
                        columns={[
                            {
                                label: 'Label',
                                id: 'label',
                                accessor: (r) => <Link to={`/predicate/edit/${r.uuid}`}>{r.label}</Link>,
                            },
                            {
                                label: 'Predicate',
                                id: 'predicate',
                            },
                            {
                                label: 'Inverse label',
                                id: 'inverse_label',
                                accessor: (r) => r.inverse_label ?? '-',
                            },
                            {
                                label: 'Directional',
                                id: 'is_directional',
                                accessor: (r) => (r.is_directional ? 'Yes' : 'No'),
                            },
                            {
                                label: 'Relationships',
                                id: 'relationship_count',
                                cellClassName: 'text-center',
                                accessor: (r) =>
                                    (r as IPredicateWithRelationshipCount).relationship_count?.[0]?.count ?? 0,
                            },
                            {
                                label: 'UUID',
                                id: 'uuid',
                            },
                            {
                                label: 'Delete',
                                id: 'delete',
                                accessor: (r) => {
                                    const count = (r as IPredicateWithRelationshipCount).relationship_count?.[0]?.count ?? 0
                                    return <DeleteButton predicate={r as IPredicate} relationshipCount={count} onDelete={onDelete} />
                                },
                            },
                        ]}
                    />
                ))}
        </ViewWithLoader>
    )
}

export default ListPredicates
