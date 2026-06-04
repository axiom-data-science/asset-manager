import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from ***REMOVED***@/components/ui/sidebar***REMOVED***

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from ***REMOVED***@/components/ui/collapsible***REMOVED***
import { Book, BookPlus, ChevronDown, List, Network, Plus, User } from ***REMOVED***lucide-react***REMOVED***
import { SidebarGroupContent, SidebarGroupLabel } from ***REMOVED***@/components/ui/sidebar***REMOVED***
import { Link } from ***REMOVED***react-router-dom***REMOVED***

import UserView from ***REMOVED***@/manage/components/user***REMOVED***

export function AppSidebar() {
  const navGroups = [
    {
      label: ***REMOVED***Documents***REMOVED***,
      icon: Book,
      actions: [
        {
          name: ***REMOVED***List documents***REMOVED***,
          icon: List,
          url: ***REMOVED***/document***REMOVED***,
        },
        {
          name: ***REMOVED***Create document***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/document/create***REMOVED***,
        },
        {
          name: ***REMOVED***Upload a file***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/file/upload***REMOVED***,
        },
        {
          name: ***REMOVED***List files***REMOVED***,
          icon: List,
          url: ***REMOVED***/file/list***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Schemas***REMOVED***,
      icon: Network,
      actions: [
        {
          name: ***REMOVED***List schemas***REMOVED***,
          icon: List,
          url: ***REMOVED***/object_schema***REMOVED***,
        },
        {
          name: ***REMOVED***Create schema***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/object_schema/create***REMOVED***,
        },
        {
          name: ***REMOVED***List types***REMOVED***,
          icon: List,
          url: ***REMOVED***/object_type***REMOVED***,
        },
        {
          name: ***REMOVED***Create type***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/object_type/create***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Forms***REMOVED***,
      icon: BookPlus,
      actions: [
        {
          name: ***REMOVED***List forms***REMOVED***,
          icon: List,
          url: ***REMOVED***/forms***REMOVED***,
        },
        {
          name: ***REMOVED***Create form***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/forms/create***REMOVED***,
        },
        {
          name: ***REMOVED***List field configs***REMOVED***,
          icon: List,
          url: ***REMOVED***/field_configs***REMOVED***,
        },
        {
          name: ***REMOVED***Create field config***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/field_configs/create***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Persons***REMOVED***,
      icon: User,
      actions: [
        {
          name: ***REMOVED***List persons***REMOVED***,
          icon: List,
          url: ***REMOVED***/persons***REMOVED***,
        },
        {
          name: ***REMOVED***Create person***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/persons/create***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Custom NINJA API***REMOVED***,
      icon: Network,
      actions: [
        {
          name: ***REMOVED***List pipelines***REMOVED***,
          icon: List,
          url: ***REMOVED***/custom/pipelines***REMOVED***,
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
