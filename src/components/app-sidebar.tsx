import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Book, BookPlus, ChevronDown, List, Network, Plus, User } from 'lucide-react'
import { SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'
import { Link } from 'react-router-dom'

import UserView from '@/manage/components/user'

export function AppSidebar() {
  const navGroups = [
    {
      label: 'Documents',
      icon: Book,
      actions: [
        {
          name: 'List documents',
          icon: List,
          url: '/document',
        },
        {
          name: 'Create document',
          icon: Plus,
          url: '/document/create',
        },
        {
          name: 'Upload a file',
          icon: Plus,
          url: '/file/upload',
        },
        {
          name: 'List files',
          icon: List,
          url: '/file/list',
        },
      ],
    },
    {
      label: 'Schemas',
      icon: Network,
      actions: [
        {
          name: 'List schemas',
          icon: List,
          url: '/object_schema',
        },
        {
          name: 'Create schema',
          icon: Plus,
          url: '/object_schema/create',
        },
        {
          name: 'List types',
          icon: List,
          url: '/object_type',
        },
        {
          name: 'Create type',
          icon: Plus,
          url: '/object_type/create',
        },
      ],
    },
    {
      label: 'Forms',
      icon: BookPlus,
      actions: [
        {
          name: 'List forms',
          icon: List,
          url: '/forms',
        },
        {
          name: 'Create form',
          icon: Plus,
          url: '/forms/create',
        },
        {
          name: 'List field configs',
          icon: List,
          url: '/field_configs',
        },
        {
          name: 'Create field config',
          icon: Plus,
          url: '/field_configs/create',
        },
      ],
    },
    {
      label: 'Users',
      icon: User,
      actions: [
        {
          name: 'List users',
          icon: List,
          url: '/users',
        },
        {
          name: 'Create user',
          icon: Plus,
          url: '/users/create',
        },
      ],
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {navGroups.map((group) => (
          <Collapsible key={group.label} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild className="font-bold text-lg cursor-pointer">
                <CollapsibleTrigger>
                  <group.icon className="mr-2" /> {group.label}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent className="py-2">
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
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserView />
      </SidebarFooter>
    </Sidebar>
  )
}
