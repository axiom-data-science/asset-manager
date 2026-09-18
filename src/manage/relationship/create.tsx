import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { validate } from ***REMOVED***@/lib/utils***REMOVED***
import Errors from ***REMOVED***@/manage/components/errors***REMOVED***
import { postRelationship } from ***REMOVED***@/manage/relationship/services***REMOVED***
import { relationshipListQueryKey, useRelationshipListWithRollupsAndLookups } from ***REMOVED***@/manage/relationship/useRelationshipList***REMOVED***
import type { IRelationship, IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { FormCreator, type IForm, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { useQueryClient } from ***REMOVED***@tanstack/react-query***REMOVED***
import { Button, Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useNavigate } from ***REMOVED***react-router-dom***REMOVED***

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
        id: ***REMOVED***create-relationship***REMOVED***,
        settings: {
            show_progress: false,
        },
        fields: [
            {
                id: ***REMOVED***from_document_uuid***REMOVED***,
                label: ***REMOVED***From document***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options:
                    data?.documents.map((d) => ({
                        label: d.label,
                        value: d.uuid,
                    })) ?? [],
            },
            {
                id: ***REMOVED***to_document_uuid***REMOVED***,
                label: ***REMOVED***To document***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options:
                    data?.documents.map((d) => ({
                        label: d.label,
                        value: d.uuid,
                    })) ?? [],
            },
            {
                id: ***REMOVED***predicate_uuid***REMOVED***,
                label: ***REMOVED***Predicate***REMOVED***,
                type: ***REMOVED***select***REMOVED***,
                required: true,
                options:
                    data?.predicates.map((p) => ({
                        label: `${p.label} (${p.predicate})`,
                        value: p.uuid,
                    })) ?? [],
            },
            {
                id: ***REMOVED***data***REMOVED***,
                label: ***REMOVED***Data (JSON)***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
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
            const payload: Omit<IRelationship, ***REMOVED***uuid***REMOVED***> = {
                from_document_uuid: String(formValues.from_document_uuid),
                to_document_uuid: String(formValues.to_document_uuid),
                predicate_uuid: String(formValues.predicate_uuid),
                data:
                    formValues.data !== undefined && formValues.data !== null && formValues.data !== ***REMOVED******REMOVED***
                        ? (formValues.data as JSON)
                        : undefined,
            }

            await postRelationship({
                relationship: payload,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            })

            queryClient.invalidateQueries({ queryKey: relationshipListQueryKey({}) })
            setSaving(false)
            navigate(***REMOVED***/relationship***REMOVED***)
        } catch (e) {
            setSaving(false)
            setErrors([
                {
                    field: ***REMOVED***form***REMOVED***,
                    message: `An error occurred while saving the relationship. ${(e as Error).message ?? ***REMOVED******REMOVED***}`,
                },
            ])
            window.scrollTo({ top: 0, behavior: ***REMOVED***smooth***REMOVED*** })
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
                    <Button onClick={onSave} type="default" disabled={saving}>
                        {saving ? <Loader className="animate-spin" /> : ***REMOVED***Save***REMOVED***}
                    </Button>
                </div>
            </div>
        </ViewWithLoader>
    )
}

export default CreateRelationship
