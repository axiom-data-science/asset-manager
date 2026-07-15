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
import { Book, BookPlus, ChartBarBig, ChevronDown, FilePen, Grid2X2, Grid2X2Plus, Import, Layers2, Layers3, LayersPlus, List, Lock, Network, PersonStanding, Plus, Share, Ship, Thermometer, User } from 'lucide-react'
import { SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'
import { Link } from 'react-router-dom'

import UserView from '@/manage/components/user'
import { useAuth } from '@/auth/useAuth'

export function AppSidebar() {
  const auth = useAuth()
  const navGroups = [
    {
      label: 'Documents',
      icon: Book,
      requiresAdmin: false,
      actions: [
        {
          name: 'List documents',
          icon: List,
          url: '/document'
        },
        {
          name: 'Create document',
          icon: Plus,
          url: '/document/create'
        },
        {
          name: 'Upload a file',
          icon: Plus,
          url: '/file/upload'
        },
        {
          name: 'List files',
          icon: List,
          url: '/file/list'
        },
      ],
    },
    {
      label: 'Schemas',
      icon: Network,
      requiresAdmin: true,
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
      requiresAdmin: true,
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
      label: 'Persons',
      icon: User,
      requiresAdmin: true,
      actions: [
        {
          name: 'List persons',
          icon: List,
          url: '/persons',
        },
        {
          name: 'Create person',
          icon: Plus,
          url: '/persons/create',
        },
      ],
    },
    {
      label: 'Examples',
      icon: FilePen,
      requiresAdmin: false,
      actions: [
        {
          name: 'List NINJA pipelines',
          icon: List,
          url: '/custom/pipelines',
        },
        {
          name: 'Lock/unlock document',
          icon: Lock,
          url: '/examples/lock-unlock-documents',
        },
        {
          name: 'Share document',
          icon: Share,
          url: '/examples/share-document',
        },
        {
          name: 'List Authentik users',
          icon: PersonStanding,
          url: '/examples/authentik-users',
        }
      ],
    },
    {
      label: 'Imports',
      icon: Import,
      requiresAdmin: true,
      actions: [
        {
          name: 'Sensor stations',
          icon: Thermometer,
          url: '/import/sensor-stations'
        },
        {
          name: 'Moving platforms',
          icon: Ship,
          url: '/import/moving-platforms'
        },
        {
          name: 'Model records (oikos)',
          icon: Grid2X2,
          url: '/import/oikos-models'
        },
        {
          name: 'Model variable records (oikos)',
          icon: Grid2X2Plus,
          url: '/import/oikos-model-variables'
        },
        {
          name: 'Binner records',
          icon: ChartBarBig,
          url: '/import/binner-records'
        },
        {
          name: 'Vector layers (oikos)',
          icon: Layers2,
          url: '/import/oikos-vector-layers'
        },
        {
          name: 'Vector layer groups (oikos)',
          icon: Layers3,
          url: '/import/oikos-vector-layer-groups'
        },
        {
          name: 'Vector modules (oikos)',
          icon: LayersPlus,
          url: '/import/oikos-vector-modules'
        }

      ]
    }
  ]

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {navGroups.filter(group => {
          if (group.requiresAdmin && !auth.isAdmin) {
            return false
          }
          return true
        }).map((group) => (
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
