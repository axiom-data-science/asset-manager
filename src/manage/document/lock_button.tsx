import type { IDocument } from "@/types/types"
import  { Button, Tooltip } from "@axdspub/axiom-ui-utilities"
import { Unlock, Lock, Loader } from "lucide-react"
import { useState, type ReactElement } from "react"
import { patchDocument } from "./services"
import { useAuth } from "@/auth/useAuth"

const LockButton = ({
  document,
  onChange,
}: {
  document: IDocument & { can_modify: boolean }
  onChange?: (locked_at: string | null) => void
}): ReactElement => {
  const auth = useAuth()
  const canModify = document.lock_sub === auth?.user?.profile?.sub || auth.isAdmin
  const [updating, setUpdating] = useState(false)
  const [locked, setLocked] = useState(document.locked_at !== null)
  const [lockedBy, setLockedBy] = useState(document.lock_sub)
  const [lockedAt, setLockedAt] = useState(document.locked_at)
  const handleClick = (): void => {
    const lockToSet = !locked ? new Date().toISOString() : null
    const lockSubToSet = !locked ? (auth?.user?.profile?.sub ?? null) : null
    setUpdating(true)
    patchDocument({
      token: auth?.user?.access_token ?? '',
      uuid: document.uuid,
      document: {
        locked_at: lockToSet,
        lock_sub: lockSubToSet,
      },
    })
      .then(() => {
        onChange?.(lockToSet)
        setLocked(lockToSet !== null)
        setLockedAt(lockToSet)
        setLockedBy(auth.user?.profile.sub ?? null)
      })
      .finally(() => {
        setUpdating(false)
      })
  }
  if (!canModify) {
    return (
      <span>
        {locked ? (
          <Lock color="slate-400" className="mx-auto w-8 h-8" />
        ) : (
          <Unlock color="slate-400" className="mx-auto w-8 h-8" />
        )}
      </span>
    )
  }
  return (
    <div className="text-center flex flex-col gap-2">
      <Tooltip
        content={locked ? 'Click to unlock this document' : 'Click to lock this document'}
        dark={true}
        useSpan={true}
        className="block text-center"
      >
        <Button
          onClick={handleClick}
          disabled={document.can_modify === false || !canModify}
          size="xs"
          variant="ghost"
        >
          {updating ? (
            <Loader className="w-8 h-8" />
          ) : locked ? (
            <Lock color="red" className="mx-auto w-8 h-8" />
          ) : (
            <Unlock color="green" className="mx-auto w-8 h-8" />
          )}
        </Button>
      </Tooltip>

      <>
        {locked && lockedAt && (
          <div className="text-[10px] text-slate-400 text-center">
            <p>
              {new Date(lockedAt).toLocaleString()}
            </p>
            <p>{lockedBy}</p>
          </div>
        )}
      </>
    </div>
  )
}

export default LockButton