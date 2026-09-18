import { useAuth } from '@/auth/useAuth'
import { validate } from '@/lib/utils'
import { CopyFields } from '@/manage/components/copy_field'
import Errors from '@/manage/components/errors'
import { patchPredicate } from '@/manage/predicate/services'
import { predicateQueryKey, usePredicate } from '@/manage/predicate/usePredicate'
import { predicateListQueryKey } from '@/manage/predicate/usePredicateList'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const EditPredicateInner = ({
    predicate,
}: {
    predicate: {
        uuid: string
        label: string
        predicate: string
        inverse_label?: string | null
        is_directional: boolean
    }
}): ReactElement => {
    const queryClient = useQueryClient()
    const auth = useAuth()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
    const [formValues, setFormValues] = useState<IFormValues>({
        label: predicate.label,
        predicate: predicate.predicate,
        inverse_label: predicate.inverse_label ?? '',
        is_directional: predicate.is_directional,
    })

    const form: IForm = {
        id: 'edit-predicate',
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: 'label',
                label: 'Label',
                type: 'text',
                required: true,
            },
            {
                id: 'predicate',
                label: 'Predicate (machine name)',
                type: 'text',
                required: true,
            },
            {
                id: 'inverse_label',
                label: 'Inverse label',
                type: 'text',
            },
            {
                id: 'is_directional',
                label: 'Directional',
                type: 'boolean',
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
            await patchPredicate({
                uuid: predicate.uuid,
                predicate: {
                    label: String(formValues.label),
                    predicate: String(formValues.predicate),
                    inverse_label:
                        formValues.inverse_label !== undefined && formValues.inverse_label !== ''
                            ? String(formValues.inverse_label)
                            : null,
                    is_directional: Boolean(formValues.is_directional),
                },
                token: auth.user?.access_token ?? '',
            })

            queryClient.invalidateQueries({ queryKey: predicateQueryKey(predicate.uuid) })
            queryClient.invalidateQueries({ queryKey: predicateListQueryKey({}) })
            setSaving(false)
            navigate('/predicate')
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: 'form',
                    message: `An error occurred while updating the predicate. ${(e as Error).message ?? ''}`,
                },
            ])
        }
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to edit a predicate.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Edit predicate</h1>
            <Errors errors={errors} />
            <CopyFields fields={[{ id: 'predicate_uuid', label: 'UUID', value: predicate.uuid }]} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onUpdate} type="default" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : 'Update'}
                </Button>
            </div>
        </div>
    )
}

const EditPredicate = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid ?? ''
    const { data, isLoading, error } = usePredicate({ uuid })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data && <EditPredicateInner predicate={data} />}
        </ViewWithLoader>
    )
}

export default EditPredicate
