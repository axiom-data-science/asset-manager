import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import { postPredicate } from ***REMOVED***@/manage/predicate/services***REMOVED***
import { predicateListQueryKey } from ***REMOVED***@/manage/predicate/usePredicateList***REMOVED***
import type { IPredicate, IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, Loader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate } from ***REMOVED***react-router-dom***REMOVED***

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
        id: ***REMOVED***create-predicate***REMOVED***,
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: ***REMOVED***predicate***REMOVED***,
                label: ***REMOVED***Predicate (machine name)***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true,
            },
            {
                id: ***REMOVED***label***REMOVED***,
                label: ***REMOVED***Label***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true,
            },
            {
                id: ***REMOVED***inverse_label***REMOVED***,
                label: ***REMOVED***Inverse label***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
            },
            {
                id: ***REMOVED***is_directional***REMOVED***,
                label: ***REMOVED***Directional***REMOVED***,
                type: ***REMOVED***boolean***REMOVED***,
            },
        ],
    }

    const onSave = async () => {
        const valid = await validate({ form, formValues })
        if (!valid.valid) {
            setErrors(valid.errors)
            window.scrollTo({ top: 0, behavior: ***REMOVED***smooth***REMOVED*** })
            return
        }

        setSaving(true)
        setErrors([])

        try {
            const payload: Omit<IPredicate, ***REMOVED***uuid***REMOVED***> = {
                label: String(formValues.label),
                predicate: String(formValues.predicate),
                inverse_label:
                    formValues.inverse_label !== undefined && formValues.inverse_label !== ***REMOVED******REMOVED***
                        ? String(formValues.inverse_label)
                        : null,
                is_directional: Boolean(formValues.is_directional),
            }

            await postPredicate({
                predicate: payload,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            })

            queryClient.invalidateQueries({ queryKey: predicateListQueryKey({}) })
            setSaving(false)
            navigate(***REMOVED***/predicate***REMOVED***)
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: ***REMOVED***form***REMOVED***,
                    message: `An error occurred while saving the predicate. ${(e as Error).message ?? ***REMOVED******REMOVED***}`,
                },
            ])
            window.scrollTo({ top: 0, behavior: ***REMOVED***smooth***REMOVED*** })
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
                <Button onClick={onSave} type="primary" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
                </Button>
            </div>
        </div>
    )
}

export default CreatePredicate
