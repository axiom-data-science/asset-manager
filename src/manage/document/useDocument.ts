import { useAuth } from '@/auth/useAuth'
import { removeUndefinedAndNullKeys } from '@/lib/utils'
import { fetchDocument, patchDocument } from '@/manage/document/services'
import { documentListQueryKey } from '@/manage/document/useDocumentList'
import { lockDocument, unlockDocument } from '@/services/postgrest/services'
import type { IDocument, IPostgrestParams, IValidationError } from '@/types/types'
import type { IForm, IFormValues } from '@axdspub/axiom-ui-forms'
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
      validate,
    }: {
      document: IDocument
      form: IForm
      formValues: IFormValues
      isUsingDataForm: boolean
      validate: ({
        form,
        formValues,
      }: {
        form: IForm
        formValues: IFormValues
      }) => Promise<{ valid: boolean; errors: IValidationError[] }>
    }) => {
      // Run validation first
      const result = await validate({ form, formValues })
      if (!result.valid) {
        throw new Error(JSON.stringify(result.errors))
      }

      // Merge and save
      const cleanValues = removeUndefinedAndNullKeys(formValues)
      const mergedData = {
        ...(document.data as JSON),
        ...(isUsingDataForm ? cleanValues : (cleanValues.data as JSON)),
      }

      const mergedDocument = {
        ...document,
        label:
          formValues.label ??
          formValues.title ??
          formValues.platform_name ??
          formValues.station_label ??
          'Untitled Document',
        description: formValues.description ?? '',
        data: mergedData,
      } as IDocument

      return patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? '',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['document'],
      })
    },
  })
}
