import { useAuth } from '@/auth/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UserAvatar from '@/manage/components/userAvatar'
import { LogOut } from 'lucide-react'
import type { ReactElement } from 'react'



const User = (): ReactElement => {
  const auth = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2">
          <UserAvatar name={`${[auth.user?.profile?.firstName, auth.user?.profile?.lastName].filter(Boolean).join(' ')}`} />
          <div className="flex flex-col items-start text-left cursor-pointer">
            <span className="text-sm font-medium">
              {auth.user?.profile?.firstName
                ? `${auth.user.profile.firstName} ${auth.user.profile.lastName ?? ''}`
                : ''}
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
