import type { ReactElement } from 'react'
import type { IDocument } from '@/types/types'
import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { patchDocument } from './services'
import { Button, Loader, Tooltip } from '@axdspub/axiom-ui-utilities'
import { Globe, UserRoundKey } from 'lucide-react'

const PublishedButton = ({
    document,
    onChange,
}: {
    document: IDocument & { can_modify: boolean }
    onChange?: (published: boolean) => void
}): ReactElement => {
    const auth = useAuth()
    const [updating, setUpdating] = useState(false)
    const [published, setPublished] = useState(document.published)
    const [publishedAt, setPublishedAt] = useState(document.published_at)
    const handleClick = (): void => {
        const pubToSet = !published
        setUpdating(true)
        patchDocument({
            token: auth?.user?.access_token ?? '',
            uuid: document.uuid,
            document: {
                published: pubToSet,
            },
        })
            .then(() => {
                onChange?.(pubToSet)
                setPublished(pubToSet)
                setPublishedAt(pubToSet ? new Date().toISOString() : null)
            })
            .finally(() => {
                setUpdating(false)
            })
    }
    return (
        <div className="text-center flex flex-col gap-2">
            <Tooltip
                content={
                    document.published ? 'Click to unpublish this document' : 'Click to publish this document'
                }
                dark={true}
                useSpan={true}
                className="block text-center"
            >
                <Button
                    onClick={handleClick}
                    disabled={document.can_modify === false || document.lock_sub !== null}
                    size="xs"
                    variant="ghost"
                >
                    {updating ? (
                        <Loader className="w-8 h-8" />
                    ) : published ? (
                        <Globe color="green" className="mx-auto w-8 h-8" />
                    ) : (
                        <UserRoundKey color="red" className="mx-auto w-8 h-8" />
                    )}
                </Button>
            </Tooltip>

            <>
                {published && publishedAt && (
                    <p className="text-[10px] text-slate-400 text-center">
                        {new Date(publishedAt).toLocaleString()}
                    </p>
                )}
            </>
        </div>
    )
}

export default PublishedButton