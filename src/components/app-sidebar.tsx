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
  'bg-red-100 text-red-800',
  'bg-yellow-100 text-yellow-800',
  'bg-green-100 text-green-800',
  'bg-blue-100 text-blue-800',
  'bg-indigo-100 text-indigo-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
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
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const avatarColor = user
    ? getColorFromName(`${user.firstName} ${user.lastName}`)
    : ''

  const navGroups = [
    {
      label: 'Documents',
      icon: Book,
      actions: [
        {
          name: 'Find document',
          icon: List,
          url: '/document'
        },
        {
          name: 'Create document',
          icon: Plus,
          url: '/document/create'
        }
      ]
    },
    {
      label: 'Schemas',
      icon: Network,
      actions: [
        {
          name: 'List schemas',
          icon: List,
          url: '/schema'
        },
        {
          name: 'Create schema',
          icon: Plus,
          url: '/schema/create'
        },
        {
          name: 'List types',
          icon: List,
          url: '/object_type'
        },
        {
          name: 'Create type',
          icon: Plus,
          url: '/object_type/create'
        }
      ],
    },
    {
      label: 'Form Configs',
      icon: Cog,
      actions: [
        {
          name: 'List form configs',
          icon: List,
          url: '/form-configs'
        },
        {
          name: 'Create form config',
          icon: Plus,
          url: '/form-configs/create'
        }
      ]
    },
    {
      label: 'Users',
      icon: User,
      actions: [
        {
          name: 'List users',
          icon: List,
          url: '/users'
        },
        {
          name: 'Create user',
          icon: Plus,
          url: '/users/create'
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
                <CollapsibleContent className='py-2'>
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
              variant='ghost'
              className='h-12 w-full justify-start gap-2 px-2'
            >
              <Avatar>
                <AvatarFallback className={avatarColor}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-col items-start text-left cursor-pointer'>
                <span className='text-sm font-medium'>
                  {auth.user?.profile?.firstName ? `${auth.user.profile.firstName} ${auth.user.profile.lastName ?? ''}` : ''}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {auth.user?.profile?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-56' align='start' side='top'>
            <DropdownMenuItem className='cursor-pointer' onClick={() => {
              auth.logout()
            }}>
              <LogOut className='mr-2 h-4 w-4' />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar >
  )
}