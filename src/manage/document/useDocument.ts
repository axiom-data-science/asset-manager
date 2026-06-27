import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { removeUndefinedAndNullKeys } from ***REMOVED***@/lib/utils***REMOVED***
import { fetchDocument, patchDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import { documentListQueryKey } from ***REMOVED***@/manage/document/useDocumentList***REMOVED***
import { lockDocument, unlockDocument } from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IDocument, IPostgrestParams, IValidationError } from ***REMOVED***@/types/types***REMOVED***
import type { IForm, IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { queryOptions, useMutation, useQuery, useQueryClient, type UseQueryResult } from ***REMOVED***@tanstack/react-query***REMOVED***

export const documentQueryKey = ({
  uuid,
  params,
}: {
  uuid: string | null
  params?: IPostgrestParams
}) => [***REMOVED***document***REMOVED***, uuid, JSON.stringify(params)]

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
        uuid: uuid ?? ***REMOVED******REMOVED***,
        params: params ?? {},
        token: token ?? ***REMOVED******REMOVED***,
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

export const useLockDocumentMutation = ({onSuccess, signal}: {onSuccess?: (locked: boolean) => void, signal?: AbortSignal}) => {
  const auth = useAuth()
  const queryClient = useQueryClient()


  return useMutation({
    mutationFn: async ({ document, lock }: { document: IDocument; lock: boolean }) => {
      if (!auth.user) throw new Error(***REMOVED***User is not authenticated***REMOVED***)


      console.log(lock ? ***REMOVED***LOCKING***REMOVED*** : ***REMOVED***UNLOCKING***REMOVED***, document.uuid, ***REMOVED***for user***REMOVED***, auth.user.profile.sub ?? ***REMOVED******REMOVED***)
      
      return lock
        ? lockDocument({
            document_uuid: document.uuid,
            user_sub: auth.user.profile.sub ?? ***REMOVED******REMOVED***,
            token: auth.user.access_token,
            signal
          })
        : unlockDocument({
            document_uuid: document.uuid,
            user_sub: auth.user.profile.sub ?? ***REMOVED******REMOVED***,
            token: auth.user.access_token,
            signal
          })
    },
    onSuccess: (_, variables) => {
      // Call the callback to update local UI state
      if (onSuccess) onSuccess(variables.lock)
      
      // Invalidate and refetch the document query to sync lock state
      queryClient.invalidateQueries({
        queryKey: [***REMOVED***document***REMOVED***],
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
      validate: ({form, formValues}: {form: IForm; formValues: IFormValues}) => Promise<{ valid: boolean; errors: IValidationError[] }>
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
          ***REMOVED***Untitled Document***REMOVED***,
        description: formValues.description ?? ***REMOVED******REMOVED***,
        data: mergedData,
      } as IDocument

      return patchDocument({
        uuid: document.uuid,
        document: mergedDocument,
        token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [***REMOVED***document***REMOVED***],
      })
    },
  })
}