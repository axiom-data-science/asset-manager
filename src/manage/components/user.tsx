import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Avatar, AvatarFallback } from ***REMOVED***@/components/ui/avatar***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from ***REMOVED***@/components/ui/dropdown-menu***REMOVED***
import UserAvatar from ***REMOVED***@/manage/components/userAvatar***REMOVED***
import { LogOut } from ***REMOVED***lucide-react***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***



const User = (): ReactElement => {
  const auth = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2">
          <UserAvatar name={`${[auth.user?.profile?.firstName, auth.user?.profile?.lastName].filter(Boolean).join(***REMOVED*** ***REMOVED***)}`} />
          <div className="flex flex-col items-start text-left cursor-pointer">
            <span className="text-sm font-medium">
              {auth.user?.profile?.firstName
                ? `${auth.user.profile.firstName} ${auth.user.profile.lastName ?? ***REMOVED******REMOVED***}`
                : ***REMOVED******REMOVED***}
            </span>
            <span className="text-xs text-muted-foreground">{auth.user?.profile?.email}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="top">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            auth.logout()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default User
