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
      label: ***REMOVED***Assets***REMOVED***,
      icon: Book,
      actions: [
        {
          name: ***REMOVED***Find assets***REMOVED***,
          icon: List,
          url: ***REMOVED***/assets***REMOVED***
        },
        {
          name: ***REMOVED***Create asset***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/assets/create***REMOVED***
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
          url: ***REMOVED***/schemas***REMOVED***
        },
        {
          name: ***REMOVED***Create schema***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/schemas/create***REMOVED***
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
      <SidebarFooter />
    </Sidebar>
  )
}