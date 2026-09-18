import { useAuth } from '@/auth/useAuth'
import { validate } from '@/lib/utils'
import Errors from '@/manage/components/errors'
import { postPredicate } from '@/manage/predicate/services'
import { predicateListQueryKey } from '@/manage/predicate/usePredicateList'
import type { IPredicate, IValidationError } from '@/types/types'
import { FormCreator, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader } from '@axdspub/axiom-ui-utilities'
import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'

const CreatePredicate = (): ReactElement => {
    const queryClient = useQueryClient()
    const auth = useAuth()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<IValidationError[]>([])
    const [formValues, setFormValues] = useState<IFormValues>({
        is_directional: true,
    })

    const form: IForm = {
        id: 'create-predicate',
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: 'predicate',
                label: 'Predicate (machine name)',
                type: 'text',
                required: true,
            },
            {
                id: 'label',
                label: 'Label',
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
            const payload: Omit<IPredicate, 'uuid'> = {
                label: String(formValues.label),
                predicate: String(formValues.predicate),
                inverse_label:
                    formValues.inverse_label !== undefined && formValues.inverse_label !== ''
                        ? String(formValues.inverse_label)
                        : null,
                is_directional: Boolean(formValues.is_directional),
            }

            await postPredicate({
                predicate: payload,
                token: auth.user?.access_token ?? '',
            })

            queryClient.invalidateQueries({ queryKey: predicateListQueryKey({}) })
            setSaving(false)
            navigate('/predicate')
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: 'form',
                    message: `An error occurred while saving the predicate. ${(e as Error).message ?? ''}`,
                },
            ])
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="p-20">
                <p>You must be logged in to create a predicate.</p>
                <Button onClick={() => void auth.login()}>Log in</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Create predicate</h1>
            <Errors errors={errors} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onSave} type="default" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : 'Save'}
                </Button>
            </div>
        </div>
    )
}

export default CreatePredicate
