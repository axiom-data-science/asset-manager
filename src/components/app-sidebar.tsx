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
import { Book, ChevronDown, Cog, List, Network, Plus, User } from "lucide-react"
import { SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar"
import { Link } from "react-router-dom"

export function AppSidebar() {


  const navGroups = [
    {
      label: 'Assets',
      icon: Book,
      actions: [
        {
          name: 'Find assets',
          icon: List,
          url: '/assets'
        },
        {
          name: 'Create asset',
          icon: Plus,
          url: '/assets/create'
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
          url: '/schemas'
        },
        {
          name: 'Create schema',
          icon: Plus,
          url: '/schemas/create'
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
      <SidebarFooter />
    </Sidebar>
  )
}