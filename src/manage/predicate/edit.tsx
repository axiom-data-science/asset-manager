import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import { CopyFields } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import { patchPredicate } from ***REMOVED***@/manage/predicate/services***REMOVED***
import { predicateQueryKey, usePredicate } from ***REMOVED***@/manage/predicate/usePredicate***REMOVED***
import { predicateListQueryKey } from ***REMOVED***@/manage/predicate/usePredicateList***REMOVED***
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate, useParams } from ***REMOVED***react-router-dom***REMOVED***

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
        inverse_label: predicate.inverse_label ?? ***REMOVED******REMOVED***,
        is_directional: predicate.is_directional,
    })

    const form: IForm = {
        id: ***REMOVED***edit-predicate***REMOVED***,
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: ***REMOVED***label***REMOVED***,
                label: ***REMOVED***Label***REMOVED***,
                type: ***REMOVED***text***REMOVED***,
                required: true,
            },
            {
                id: ***REMOVED***predicate***REMOVED***,
                label: ***REMOVED***Predicate (machine name)***REMOVED***,
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
                        formValues.inverse_label !== undefined && formValues.inverse_label !== ***REMOVED******REMOVED***
                            ? String(formValues.inverse_label)
                            : null,
                    is_directional: Boolean(formValues.is_directional),
                },
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            })

            queryClient.invalidateQueries({ queryKey: predicateQueryKey(predicate.uuid) })
            queryClient.invalidateQueries({ queryKey: predicateListQueryKey({}) })
            setSaving(false)
            navigate(***REMOVED***/predicate***REMOVED***)
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: ***REMOVED***form***REMOVED***,
                    message: `An error occurred while updating the predicate. ${(e as Error).message ?? ***REMOVED******REMOVED***}`,
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
            <CopyFields fields={[{ id: ***REMOVED***predicate_uuid***REMOVED***, label: ***REMOVED***UUID***REMOVED***, value: predicate.uuid }]} />
            <FormCreator form={form} formValueState={[formValues, setFormValues]} />
            <div className="flex flex-row sticky bottom-0 bg-white/80 py-4">
                <Button onClick={onUpdate} type="default" disabled={saving}>
                    {saving ? <Loader className="animate-spin" /> : ***REMOVED***Update***REMOVED***}
                </Button>
            </div>
        </div>
    )
}

const EditPredicate = (): ReactElement => {
    const params = useParams()
    const uuid = params.uuid ?? ***REMOVED******REMOVED***
    const { data, isLoading, error } = usePredicate({ uuid })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            {data && <EditPredicateInner predicate={data} />}
        </ViewWithLoader>
    )
}

export default EditPredicate
