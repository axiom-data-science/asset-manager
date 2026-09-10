import { useAuth } from '@/auth/useAuth'
import { validate } from '@/lib/utils'
import { CopyFields } from '@/manage/components/copy_field'
import Errors from '@/manage/components/errors'
import Link from '@/manage/components/link'
import { patchRelationship } from '@/manage/relationship/services'
import { relationshipListQueryKey } from '@/manage/relationship/useRelationshipList'
import { relationshipQueryKey, useRelationshipWithLookups } from '@/manage/relationship/useRelationship'
import type { IFormValues, IForm } from '@axdspub/axiom-ui-forms'
import { FormCreator } from '@axdspub/axiom-ui-forms'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
        id: 'edit-relationship',
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: 'from_document_uuid',
                label: 'From document',
                type: 'select',
                required: true,
                options: documents.map((d) => ({ label: d.label, value: d.uuid })),
            },
            {
                id: 'to_document_uuid',
                label: 'To document',
                type: 'select',
                required: true,
                options: documents.map((d) => ({ label: d.label, value: d.uuid })),
            },
            {
                id: 'predicate_uuid',
                label: 'Predicate',
                type: 'select',
                required: true,
                options: predicates.map((p) => ({ label: `${p.label} (${p.predicate})`, value: p.uuid })),
            },
            {
                id: 'data',
                label: 'Data (JSON)',
                type: 'json',
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
                        formValues.data !== undefined && formValues.data !== null && formValues.data !== ''
                            ? (formValues.data as JSON)
                            : undefined,
                },
                token: auth.user?.access_token ?? '',
            })

            queryClient.invalidateQueries({ queryKey: relationshipQueryKey(relationship.uuid) })
            queryClient.invalidateQueries({ queryKey: relationshipListQueryKey({}) })
            setSaving(false)
            navigate('/relationship')
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: 'form',
                    message: `An error occurred while updating the relationship. ${(e as Error).message ?? ''}`,
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
            <CopyFields fields={[{ id: 'relationship_uuid', label: 'UUID', value: relationship.uuid }]} />
            <div className="text-sm text-slate-600">
                <Link to={`/document/edit/${relationship.from_document_uuid}`}>View from document</Link>
                {' | '}
                <Link to={`/document/edit/${relationship.to_document_uuid}`}>View to document</Link>
            </div>
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onUpdate} type="primary" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : 'Update'}
                </Button>
            </div>
        </div>
    )
}

const EditRelationship = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid ?? ''
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
