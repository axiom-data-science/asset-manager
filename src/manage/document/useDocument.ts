import { useAuth } from '@/auth/useAuth'
import { removeUndefinedAndNullKeys } from '@/lib/utils'
import { fetchDocument, patchDocument } from '@/manage/document/services'
import { documentListQueryKey } from '@/manage/document/useDocumentList'
import { fetchObjectType } from '@/manage/object_type/services'
import { lockDocument, unlockDocument } from '@/services/postgrest/services'
import type {
  IDocument,
  IObjectType,
  IObjectTypeFieldMappings,
  IPostgrestParams,
  IValidationError,
} from '@/types/types'
import { getters, type IForm, type IFormValues } from '@axdspub/axiom-ui-forms'
import { getDocumentMetadata } from './documentMetadata'
import { validateDocumentForm } from './documentValidation'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

export const documentQueryKey = ({
  uuid,
  params,
}: {
  uuid: string | null
  params?: IPostgrestParams
}) => ['document', uuid, JSON.stringify(params)]

export const getDocumentQuery = <T>({
  uuid,
  params,
  token,
}: {
  uuid: string | null
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: documentQueryKey({ uuid, params }),
    enabled: uuid !== null,
    queryFn: async ({ signal }): Promise<IDocument<T>> => {
      const rawDocument = await fetchDocument<T>({
        uuid: uuid ?? '',
        params: params ?? {},
        token: token ?? '',
        signal,
      })

      return rawDocument
    },
  })
}

export const getDocumentAndObjectTypeAndObjectTypeConfigQuery = <T>({
  uuid,
  params,
  token
}: {
  uuid: string | null
  params?: IPostgrestParams
  token?: string
}) => {
  return queryOptions({
    queryKey: documentQueryKey({ uuid, params }),
    enabled: uuid !== null,
    queryFn: async ({ signal }) => {
      const rawDocument = await fetchDocument<T>({
        uuid: uuid ?? '',
        params: params ?? {},
        token: token ?? '',
        signal,
      })

      const objectTypeUUID = rawDocument.object_type_uuid
      const objectType = await fetchObjectType({
        uuid: objectTypeUUID,
        token: token ?? '',
        signal,
      })

      return {
        document: rawDocument,
        objectType
      }
    },
  })
}

export const useDocument = <T>(
  uuid: string | null,
  params?: IPostgrestParams
): UseQueryResult<IDocument<T>> => {
  const auth = useAuth()
  const queryResult = useQuery(
    getDocumentQuery<T>({ uuid, params, token: auth.user?.access_token })
  )
  return queryResult
}


export const useDocumentAndObjectTypeAndObjectTypeConfig = <T>(
  uuid: string | null,
  params?: IPostgrestParams
): UseQueryResult<{ document: IDocument<T>; objectType: IObjectType }> => {
  const auth = useAuth()
  const queryResult = useQuery(
    getDocumentAndObjectTypeAndObjectTypeConfigQuery<T>({ uuid, params, token: auth.user?.access_token })
  )
  return queryResult
}


export const useClearDocumentQueryCache = (uuid: string | null, params?: IPostgrestParams) => {
  const queryClient = useQueryClient()
  queryClient.invalidateQueries({
    queryKey: documentQueryKey({ uuid, params }).concat(documentListQueryKey({})).flat(),
  })
}

export const useLockDocumentMutation = ({
  onSuccess,
}: {
  onSuccess?: (locked: boolean) => void
}) => {
  const auth = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      document,
      lock,
      signal,
    }: {
      document: IDocument
      lock: boolean
      signal?: AbortSignal
    }) => {
      if (!auth.user) throw new Error('User is not authenticated')

      console.log(
        lock ? 'LOCKING' : 'UNLOCKING',
        document.uuid,
        'for user',
        auth.user.profile.sub ?? ''
      )

      return lock
        ? lockDocument({
          document_uuid: document.uuid,
          user_sub: auth.user.profile.sub ?? '',
          token: auth.user.access_token,
          signal,
        })
        : unlockDocument({
          document_uuid: document.uuid,
          user_sub: auth.user.profile.sub ?? '',
          token: auth.user.access_token,
          signal,
        })
    },
    onSuccess: (_, variables) => {
      // Call the callback to update local UI state
      if (onSuccess) onSuccess(variables.lock)

      // Invalidate and refetch the document query to sync lock state
      queryClient.invalidateQueries({
        queryKey: ['document'],
      })
    },
  })
}

export const useSaveDocumentMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      document,
      form,
      formValues,
      isUsingDataForm,
      fieldMappings,
      schema,
      validate,
    }: {
      document: IDocument
      form: IForm
      formValues: IFormValues
      isUsingDataForm: boolean
      fieldMappings?: IObjectTypeFieldMappings
      schema?: Record<string, unknown>
      validate: ({
        form,
        formValues,
        schema
      }: {
        form: IForm
        formValues: IFormValues,
        schema?: Record<string, unknown>
      }) => Promise<{ valid: boolean; errors: IValidationError[] }>
    }) => {
      // Run validation first
      const result = await validateDocumentForm({ form, formValues, schema, validate })
      if (!result.valid) {
        return {
          valid: false,
          errors: result.errors
        }
      }

      // Merge and save
      const cleanValues = removeUndefinedAndNullKeys(
        // get only form values intended for saving according to the form
        getters.getFormPayload(formValues, form)
      )
      const mergedData = {
        ...(document.data as JSON),
        ...(isUsingDataForm ? cleanValues : (cleanValues.data as JSON)),
      }
      const { label, description } = getDocumentMetadata({
        formValues,
        valuesToSave: cleanValues as IFormValues,
        labelPath: fieldMappings?.label,
        descriptionPath: fieldMappings?.description,
      })

      const mergedDocument = {
        ...document,
        label,
        description,
        data: mergedData,
      } as IDocument

      const valid = await validateDocumentForm({
        form,
        formValues: cleanValues as IFormValues,
        schema,
        validate,
      })
      if (!valid.valid) {
        return {
          valid: false,
          errors: valid.errors
        }
      }


      const updatedDoc = patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? '',
      })
      return {
        document: updatedDoc,
        valid: true,
        errors: []
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['document'],
      })
    },
  })
}
