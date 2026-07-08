import { useAuth } from "@/auth/useAuth"
import Link from "@/manage/components/link"
import { useDocumentList } from "@/manage/document/useDocumentList"
import { lockDocument, unlockDocument } from "@/services/postgrest/services"
import type { IDocument } from "@/types/types"
import { Button, Loader, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { Check, Copy, Lock, Unlock } from "lucide-react"
import { useState } from "react"


const ToggleDocumentLock = ({ document, className }: { document: IDocument, className?: string }) => {
    const auth = useAuth()
    const [isUpdating, setIsUpdating] = useState(false)
    const [locked, setLocked] = useState(document.lock_sub ? true : false)
    const [copied, setCopied] = useState(false)
    const updateLockStatus = async () => {
        setIsUpdating(true)
        try {
            if (locked) {
                const isUnlocked = await unlockDocument({
                    document_uuid: document.uuid,
                    user_sub: auth?.user?.profile?.sub ?? '',
                    token: auth?.user?.access_token ?? ''
                })
                if (isUnlocked) {
                    setLocked(false)
                }
            } else {
                const isLocked = await lockDocument({
                    document_uuid: document.uuid,
                    user_sub: auth?.user?.profile?.sub ?? '',
                    token: auth?.user?.access_token ?? ''
                })
                if (isLocked) {
                    setLocked(true)
                }
            }
        } catch (error) {
            console.error("Error updating lock status:", error)
        }
        setIsUpdating(false)
    }

    if (auth === undefined) {
        return <p className="text-sm text-gray-500">User is not authenticated</p>
    }

    return <div className={`flex flex-row gap-4 justify-between items-center ${className}`}>
        <p className='flex flex-col gap-1'>
            <Link className='font-bold' to={`/document/edit/${document.uuid}`}>{document.label}</Link>
            <span className='text-xs text-slate-400 flex flex-row items-center gap-2 cursor-pointer' onClick={() => {
                navigator.clipboard.writeText(document.uuid)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }}>{document.uuid} {copied ? <Check className='w-5 h-5 text-white bg-green-600 rounded-2xl p-0.5 font-bold' /> : <Copy className='w-5 h-5 p-1' />}</span>
        </p>

        <div className="flex flex-row gap-4 items-center">
            <p className="text-sm text-gray-500">Locked: {document.lock_sub ? 'Yes' : 'No'}</p>

            <Button
                variant={locked ? 'alert' : 'create'}
                onClick={updateLockStatus}
                disabled={isUpdating}
            >

                {isUpdating ? <Loader className='w-4 h-4' /> : locked ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4" />}
            </Button>

        </div>
    </div>

}

const LockDocuments = () => {
    const { isLoading, data: documents, error } = useDocumentList({})
    return <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
        {
            documents && (
                <>
                    <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Lock/unlock documents</h1>
                    <div className='flex flex-col'>
                        {
                            documents.items.sort((a, b) => a.label.localeCompare(b.label)).map((document) => (
                                <ToggleDocumentLock key={document.uuid} document={document} className='odd:bg-slate-100 even:bg-slate-200 p-4' />
                            ))
                        }
                    </div>
                </>
            )
        }
    </ViewWithLoader>
}

export default LockDocuments