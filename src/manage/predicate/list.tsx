import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import { deletePredicate } from ***REMOVED***@/manage/predicate/services***REMOVED***
import { predicateListQueryKey, usePredicateListWithRollups } from ***REMOVED***@/manage/predicate/usePredicateList***REMOVED***
import type { IPostgrestFilter, IPostgrestParams, IPredicate, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, SelectInput, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { X } from ***REMOVED***lucide-react***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useSearchParams } from ***REMOVED***react-router-dom***REMOVED***

const ALL_FILTER_VALUE = ***REMOVED***__all__***REMOVED***

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
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        }).then(() => {
            setConfirm(false)
            onDelete()
        })
    }

    return (
        <span className="flex flex-col gap-2">
            {confirm && relationshipCount > 0 && (
                <span className="text-xs text-red-600">
                    This will also delete {relationshipCount} relationship{relationshipCount === 1 ? ***REMOVED******REMOVED*** : ***REMOVED***s***REMOVED***}
                </span>
            )}
            <span className="flex flex-row items-center gap-2">
                <Button onClick={onClick} size="xs" type="alert" className="text-white">
                    {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
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

    const rollups = [***REMOVED***is_directional***REMOVED***]
    const filterKeys = new Set(rollups)

    const userFilters: IPostgrestFilter[] = Object.keys(filters)
        .filter((k) => filterKeys.has(k))
        .map((k) => ({
            column: k,
            operator: ***REMOVED***eq***REMOVED*** as const,
            value: String(filters[k]),
        }))

    const params: IPostgrestParams = {
        order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
        select: [***REMOVED*******REMOVED***, ***REMOVED***relationship_count:relationship(count)***REMOVED***],
        filters: userFilters,
    }

    const targetedParams: Record<string, IPostgrestParams> = {
        predicate: {
            order: [{ column: ***REMOVED***label***REMOVED***, dir: ***REMOVED***asc***REMOVED*** }],
            select: [***REMOVED*******REMOVED***, ***REMOVED***relationship_count:relationship(count)***REMOVED***],
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
                if (value === undefined || value === ***REMOVED******REMOVED***) {
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
                        (item) => item.label !== null && item.label !== ***REMOVED******REMOVED***
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
                                    { label: ***REMOVED***All directions***REMOVED***, value: ALL_FILTER_VALUE },
                                    ...rollup.map((item) => ({
                                        label: `${item.label === ***REMOVED***true***REMOVED*** ? ***REMOVED***Directional***REMOVED*** : ***REMOVED***Non-directional***REMOVED***} (${item.count})`,
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
                        size: ***REMOVED***sm***REMOVED***,
                        type: ***REMOVED***create***REMOVED***,
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
                                label: ***REMOVED***Label***REMOVED***,
                                id: ***REMOVED***label***REMOVED***,
                                accessor: (r) => <Link to={`/predicate/edit/${r.uuid}`}>{r.label}</Link>,
                            },
                            {
                                label: ***REMOVED***Predicate***REMOVED***,
                                id: ***REMOVED***predicate***REMOVED***,
                            },
                            {
                                label: ***REMOVED***Inverse label***REMOVED***,
                                id: ***REMOVED***inverse_label***REMOVED***,
                                accessor: (r) => r.inverse_label ?? ***REMOVED***-***REMOVED***,
                            },
                            {
                                label: ***REMOVED***Directional***REMOVED***,
                                id: ***REMOVED***is_directional***REMOVED***,
                                accessor: (r) => (r.is_directional ? ***REMOVED***Yes***REMOVED*** : ***REMOVED***No***REMOVED***),
                            },
                            {
                                label: ***REMOVED***Relationships***REMOVED***,
                                id: ***REMOVED***relationship_count***REMOVED***,
                                cellClassName: ***REMOVED***text-center***REMOVED***,
                                accessor: (r) =>
                                    (r as IPredicateWithRelationshipCount).relationship_count?.[0]?.count ?? 0,
                            },
                            {
                                label: ***REMOVED***UUID***REMOVED***,
                                id: ***REMOVED***uuid***REMOVED***,
                            },
                            {
                                label: ***REMOVED***Delete***REMOVED***,
                                id: ***REMOVED***delete***REMOVED***,
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
