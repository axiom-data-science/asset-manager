import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import { CopyFields } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import Link from ***REMOVED***@/manage/components/link***REMOVED***
import { patchRelationship } from ***REMOVED***@/manage/relationship/services***REMOVED***
import { relationshipListQueryKey } from ***REMOVED***@/manage/relationship/useRelationshipList***REMOVED***
import { relationshipQueryKey, useRelationshipWithLookups } from ***REMOVED***@/manage/relationship/useRelationship***REMOVED***
import type { IFormValues, IForm } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { FormCreator } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***

const EditRelationshipInner = ({
    relationship,
    documents,
    predicates,
}: {
    relationship: {
        uuid: string
        from_document_uuid: string
        to_document_uuid: string
        predicate_uuid: string
        data?: JSON
    }
    documents: { uuid: string; label: string }[]
    predicates: { uuid: string; label: string; predicate: string }[]
}): ReactElement => {
    const queryClient = useQueryClient()
    const auth = useAuth()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
    const [formValues, setFormValues] = useState<IFormValues>({
        from_document_uuid: relationship.from_document_uuid,
        to_document_uuid: relationship.to_document_uuid,
        predicate_uuid: relationship.predicate_uuid,
        data: relationship.data,
    })

    const form: IForm = {
        id: ***REMOVED***edit-relationship***REMOVED***,
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: ***REMOVED***from_document_uuid***REMOVED***,
                label: ***REMOVED***From document***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options: documents.map((d) => ({ label: d.label, value: d.uuid })),
            },
            {
                id: ***REMOVED***to_document_uuid***REMOVED***,
                label: ***REMOVED***To document***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options: documents.map((d) => ({ label: d.label, value: d.uuid })),
            },
            {
                id: ***REMOVED***predicate_uuid***REMOVED***,
                label: ***REMOVED***Predicate***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options: predicates.map((p) => ({ label: `${p.label} (${p.predicate})`, value: p.uuid })),
            },
            {
                id: ***REMOVED***data***REMOVED***,
                label: ***REMOVED***Data (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
            },
        ],
    }

    const onUpdate = async () => {
        const valid = await validate({ form, formValues })
        if (!valid.valid) {
            setErrors(valid.errors)
            return
        }

        setSaving(true)
        setErrors([])
        try {
            await patchRelationship({
                uuid: relationship.uuid,
                relationship: {
                    from_document_uuid: String(formValues.from_document_uuid),
                    to_document_uuid: String(formValues.to_document_uuid),
                    predicate_uuid: String(formValues.predicate_uuid),
                    data:
                        formValues.data !== undefined && formValues.data !== null && formValues.data !== ***REMOVED******REMOVED***
                            ? (formValues.data as JSON)
                            : undefined,
                },
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            })

            queryClient.invalidateQueries({ queryKey: relationshipQueryKey(relationship.uuid) })
            queryClient.invalidateQueries({ queryKey: relationshipListQueryKey({}) })
            setSaving(false)
            navigate(***REMOVED***/relationship***REMOVED***)
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: ***REMOVED***form***REMOVED***,
                    message: `An error occurred while updating the relationship. ${(e as Error).message ?? ***REMOVED******REMOVED***}`,
                },
            ])
        }
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to edit a relationship.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Edit relationship</h1>
            <Errors errors={errors} />
            <CopyFields fields={[{ id: ***REMOVED***relationship_uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: relationship.uuid }]} />
            <div className="text-sm text-slate-600">
                <Link to={`/document/edit/${relationship.from_document_uuid}`}>View from document</Link>
                {***REMOVED*** | ***REMOVED***}
                <Link to={`/document/edit/${relationship.to_document_uuid}`}>View to document</Link>
            </div>
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onUpdate} type="default" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}
                </Button>
            </div>
        </div>
    )
}

const EditRelationship = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid ?? ***REMOVED******REMOVED***
    const { data, isLoading, error } = useRelationshipWithLookups({ uuid })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data && (
                <EditRelationshipInner
                    relationship={data.relationship}
                    documents={data.documents}
                    predicates={data.predicates}
                />
            )}
        </ViewWithLoader>
    )
}

export default EditRelationship
