import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Avatar, AvatarFallback } from ***REMOVED***@/components/ui/avatar***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from ***REMOVED***@/components/ui/dropdown-menu***REMOVED***
import { LogOut } from ***REMOVED***lucide-react***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***

const colors = [
  ***REMOVED***bg-red-100 text-red-800***REMOVED***,
  ***REMOVED***bg-yellow-100 text-yellow-800***REMOVED***,
  ***REMOVED***bg-green-100 text-green-800***REMOVED***,
  ***REMOVED***bg-blue-100 text-blue-800***REMOVED***,
  ***REMOVED***bg-indigo-100 text-indigo-800***REMOVED***,
  ***REMOVED***bg-purple-100 text-purple-800***REMOVED***,
  ***REMOVED***bg-pink-100 text-pink-800***REMOVED***,
  ***REMOVED***bg-teal-100 text-teal-800***REMOVED***,
]

function getColorFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const User = (): ReactElement => {
  const auth = useAuth()
  const user = auth.user?.profile
  const initials = `${user?.firstName?.[0] ?? ***REMOVED******REMOVED***}${user?.lastName?.[0] ?? ***REMOVED******REMOVED***}`.toUpperCase()
  const avatarColor = user ? getColorFromName(`${user.firstName} ${user.lastName}`) : ***REMOVED******REMOVED***

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2">
          <Avatar>
            <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
          </Avatar>
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
