import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import Table from ***REMOVED***@/manage/components/table***REMOVED***
import { deleteRelationship } from ***REMOVED***@/manage/relationship/services***REMOVED***
import { relationshipListQueryKey, useRelationshipListWithRollupsAndLookups } from ***REMOVED***@/manage/relationship/useRelationshipList***REMOVED***
import type { IPostgrestFilter, IPostgrestParams, IRelationship, IRollup } from ***REMOVED***@/types/types***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, SelectInput, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useSearchParams } from ***REMOVED***react-router-dom***REMOVED***

const ALL_FILTER_VALUE = ***REMOVED***__all__***REMOVED***

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
            token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
        }).then(() => {
            setConfirm(false)
            onDelete()
        })
    }

    return (
        <Button onClick={onClick} size="xs" type="alert" className="text-white">
            {confirm ? ***REMOVED***Confirm***REMOVED*** : ***REMOVED***Delete***REMOVED***}
        </Button>
    )
}

const formatJsonPreview = (data: unknown): string => {
    if (data === undefined || data === null || data === ***REMOVED******REMOVED***) {
        return ***REMOVED***-***REMOVED***
    }
    try {
        const raw = JSON.stringify(data)
        return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw
    } catch {
        return String(data)
    }
}

const ListRelationships = (): ReactElement => {
    const auth = useAuth()
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()
    const filters: Record<string, string | undefined> = Object.fromEntries(
        Array.from(searchParams.entries())
    )

    const rollups = [***REMOVED***predicate_uuid***REMOVED***]

    const filterKeys = new Set(rollups)
    const userFilters: IPostgrestFilter[] = Object.keys(filters)
        .filter((k) => filterKeys.has(k))
        .map((k) => ({
            column: k,
            operator: ***REMOVED***eq***REMOVED*** as const,
            value: String(filters[k]),
        }))

    const params: IPostgrestParams = {
        order: [{ column: ***REMOVED***uuid***REMOVED***, dir: ***REMOVED***desc***REMOVED*** }],
        filters: userFilters,
    }

    const targetedParams: Record<string, IPostgrestParams> = {
        relationship: {
            order: [{ column: ***REMOVED***uuid***REMOVED***, dir: ***REMOVED***desc***REMOVED*** }],
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

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Relationships</h1>

            <div className="flex flex-row flex-wrap gap-4 p-2 sticky top-10 bg-white z-10">
                {Object.keys(data?.relationships.rollups ?? {}).map((rollupKey) => {
                    const rollup = (data?.relationships.rollups?.[rollupKey] ?? []).filter(
                        (item) => item.label !== null && item.label !== ***REMOVED******REMOVED***
                    ) as IRollup[]
                    if (rollup.length < 1) {
                        return null
                    }

                    const label = ***REMOVED***Predicate***REMOVED***

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
                        size: ***REMOVED***sm***REMOVED***,
                        type: ***REMOVED***create***REMOVED***,
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
                                label: ***REMOVED***UUID***REMOVED***,
                                id: ***REMOVED***uuid***REMOVED***,
                                accessor: (r) => <Link to={`/relationship/edit/${r.uuid}`}>{r.uuid}</Link>,
                            },
                            {
                                label: ***REMOVED***From document***REMOVED***,
                                id: ***REMOVED***from_document_uuid***REMOVED***,
                                accessor: (r) => (
                                    <Link to={`/document/edit/${r.from_document_uuid}`}>
                                        {documentByUuid[r.from_document_uuid] ?? r.from_document_uuid}
                                    </Link>
                                ),
                            },
                            {
                                label: ***REMOVED***Predicate***REMOVED***,
                                id: ***REMOVED***predicate_uuid***REMOVED***,
                                accessor: (r) => {
                                    const predicate = predicateByUuid[r.predicate_uuid]
                                    return predicate ? `${predicate.label} (${predicate.predicate})` : r.predicate_uuid
                                },
                            },
                            {
                                label: ***REMOVED***To document***REMOVED***,
                                id: ***REMOVED***to_document_uuid***REMOVED***,
                                accessor: (r) => (
                                    <Link to={`/document/edit/${r.to_document_uuid}`}>
                                        {documentByUuid[r.to_document_uuid] ?? r.to_document_uuid}
                                    </Link>
                                ),
                            },
                            {
                                label: ***REMOVED***Delete***REMOVED***,
                                id: ***REMOVED***delete***REMOVED***,
                                accessor: (r) => <DeleteButton relationship={r as IRelationship} onDelete={onDelete} />,
                            },
                        ]}
                    />
                ))}
        </ViewWithLoader>
    )
}

export default ListRelationships
