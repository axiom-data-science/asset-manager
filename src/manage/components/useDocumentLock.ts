import { useAuth } from "@/auth/useAuth"
import { lockDocument, unlockDocument } from "@/services/postgrest/services"
import type { IDocument } from "@/types/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"


export const useDocumentLock = ({
    document,
    lock
}:{
    document: IDocument
    lock: boolean
}) => {
        const auth = useAuth()
        const queryClient = useQueryClient()

    return useQuery({
        queryKey: ['lock-document', document.uuid],
        queryFn: async () => {
            if (!auth.user) {
                throw new Error('User is not authenticated')
            }

            const locked = lock 
            ?  await lockDocument({
                document_uuid: document.uuid,
                user_sub: auth.user.profile.sub ?? '',
                token: auth.user.access_token,
            })
            : await unlockDocument({
                document_uuid: document.uuid,
                user_sub: auth.user.profile.sub ?? '',
                token: auth.user.access_token,
            })

            await queryClient.invalidateQueries({ queryKey: ['document'] })
            return locked


        }
    })
}


export const useLockDocument = (document: IDocument) => {
    return useDocumentLock({ document, lock: true })
}
export const useUnlockDocument = (document: IDocument) => {
    return useDocumentLock({ document, lock: false })
}