import { useAuth } from '@/auth/useAuth'
import { validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { postRelationship } from '@/manage/relationship/services'
import { relationshipListQueryKey, useRelationshipListWithRollupsAndLookups } from '@/manage/relationship/useRelationshipList'
import type { IRelationship, IValidationError } from '@/types/types'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'

const CreateRelationship = (): ReactElement => {
    const queryClient = useQueryClient()
    const auth = useAuth()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<IValidationError[]>([])
    const [formValues, setFormValues] = useState<IFormValues>({})
    const { data, isLoading, error } = useRelationshipListWithRollupsAndLookups({
        rollups: [],
        params: { limit: 1 },
    })

    const form: IForm = {
        id: 'create-relationship',
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: 'from_document_uuid',
                label: 'From document',
                type: 'select',
                required: true,
                options:
                    data?.documents.map((d) => ({
                        label: d.label,
                        value: d.uuid,
                    })) ?? [],
            },
            {
                id: 'to_document_uuid',
                label: 'To document',
                type: 'select',
                required: true,
                options:
                    data?.documents.map((d) => ({
                        label: d.label,
                        value: d.uuid,
                    })) ?? [],
            },
            {
                id: 'predicate_uuid',
                label: 'Predicate',
                type: 'select',
                required: true,
                options:
                    data?.predicates.map((p) => ({
                        label: `${p.label} (${p.predicate})`,
                        value: p.uuid,
                    })) ?? [],
            },
            {
                id: 'data',
                label: 'Data (JSON)',
                type: 'json',
            },
        ],
    }

    const onSave = async () => {
        const valid = await validate({ form, formValues })
        if (!valid.valid) {
            setErrors(valid.errors)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setSaving(true)
        setErrors([])
        try {
            const payload: Omit<IRelationship, 'uuid'> = {
                from_document_uuid: String(formValues.from_document_uuid),
                to_document_uuid: String(formValues.to_document_uuid),
                predicate_uuid: String(formValues.predicate_uuid),
                data:
                    formValues.data !== undefined && formValues.data !== null && formValues.data !== ''
                        ? (formValues.data as JSON)
                        : undefined,
            }

            await postRelationship({
                relationship: payload,
                token: auth.user?.access_token ?? '',
            })

            queryClient.invalidateQueries({ queryKey: relationshipListQueryKey({}) })
            setSaving(false)
            navigate('/relationship')
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: 'form',
                    message: `An error occurred while saving the relationship. ${(e as Error).message ?? ''}`,
                },
            ])
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to create a relationship.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold">Create relationship</h1>
                <Errors errors={errors} />
                <FormCreator form={form} formValueState={[formValues, setFormValues]} />
                <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                    <Button onClick={onSave} type="primary" disabled={saving}>
                        {saving ? <Loader className="animate-spin" /> : 'Save'}
                    </Button>
                </div>
            </div>
        </ViewWithLoader>
    )
}

export default CreateRelationship
