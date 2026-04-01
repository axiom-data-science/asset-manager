import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Book, ChevronDown, Cog, List, LogOut, Network, Plus, User } from "lucide-react"
import { SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/useAuth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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

export function AppSidebar() {
  const auth = useAuth();
  console.log(auth)
  const user = auth.user?.profile;
  const initials = `${user?.firstName?.[0] ?? ***REMOVED******REMOVED***}${user?.lastName?.[0] ?? ***REMOVED******REMOVED***}`.toUpperCase();
  const avatarColor = user
    ? getColorFromName(`${user.firstName} ${user.lastName}`)
    : ***REMOVED******REMOVED***

  const navGroups = [
    {
      label: ***REMOVED***Documents***REMOVED***,
      icon: Book,
      actions: [
        {
          name: ***REMOVED***Find document***REMOVED***,
          icon: List,
          url: ***REMOVED***/document***REMOVED***
        },
        {
          name: ***REMOVED***Create document***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/document/create***REMOVED***
        }
      ]
    },
    {
      label: ***REMOVED***Schemas***REMOVED***,
      icon: Network,
      actions: [
        {
          name: ***REMOVED***List schemas***REMOVED***,
          icon: List,
          url: ***REMOVED***/schema***REMOVED***
        },
        {
          name: ***REMOVED***Create schema***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/schema/create***REMOVED***
        },
        {
          name: ***REMOVED***List types***REMOVED***,
          icon: List,
          url: ***REMOVED***/object_type***REMOVED***
        },
        {
          name: ***REMOVED***Create type***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/object_type/create***REMOVED***
        }
      ],
    },
    {
      label: ***REMOVED***Form Configs***REMOVED***,
      icon: Cog,
      actions: [
        {
          name: ***REMOVED***List form configs***REMOVED***,
          icon: List,
          url: ***REMOVED***/form-configs***REMOVED***
        },
        {
          name: ***REMOVED***Create form config***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/form-configs/create***REMOVED***
        }
      ]
    },
    {
      label: ***REMOVED***Users***REMOVED***,
      icon: User,
      actions: [
        {
          name: ***REMOVED***List users***REMOVED***,
          icon: List,
          url: ***REMOVED***/users***REMOVED***
        },
        {
          name: ***REMOVED***Create user***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/users/create***REMOVED***
        }
      ]
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {
          navGroups.map((group) => (
            <Collapsible key={group.label} defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild className="font-bold text-lg cursor-pointer">
                  <CollapsibleTrigger>
                    <group.icon className="mr-2" /> {group.label}
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent className=***REMOVED***py-2***REMOVED***>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.actions.map((action) => (
                        <SidebarMenuItem key={action.name}>
                          <SidebarMenuButton asChild>
                            <Link to={action.url}>
                              <action.icon />
                              <span>{action.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))
        }
      </SidebarContent>
      <SidebarFooter>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant=***REMOVED***ghost***REMOVED***
              className=***REMOVED***h-12 w-full justify-start gap-2 px-2***REMOVED***
            >
              <Avatar>
                <AvatarFallback className={avatarColor}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className=***REMOVED***flex flex-col items-start text-left cursor-pointer***REMOVED***>
                <span className=***REMOVED***text-sm font-medium***REMOVED***>
                  {auth.user?.profile?.firstName ? `${auth.user.profile.firstName} ${auth.user.profile.lastName ?? ***REMOVED******REMOVED***}` : ***REMOVED******REMOVED***}
                </span>
                <span className=***REMOVED***text-xs text-muted-foreground***REMOVED***>
                  {auth.user?.profile?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className=***REMOVED***w-56***REMOVED*** align=***REMOVED***start***REMOVED*** side=***REMOVED***top***REMOVED***>
            <DropdownMenuItem className=***REMOVED***cursor-pointer***REMOVED*** onClick={() => {
              auth.logout()
            }}>
              <LogOut className=***REMOVED***mr-2 h-4 w-4***REMOVED*** />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar >
  )
}