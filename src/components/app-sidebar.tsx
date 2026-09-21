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
import {
  Book,
  BookPlus,
  Group,
  ChevronDown,
  FilePen,
  FileSpreadsheet,
  Import,
  List,
  Lock,
  Network,
  PersonStanding,
  Plus,
  RotateCw,
  Share,
  User,
  BookA,
} from 'lucide-react'
import { SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar'
import { Link, useLocation } from 'react-router-dom'

import UserView from '@/manage/components/user'
import { useAuth } from '@/auth/useAuth'
import headerStateAtom from '@/state/headerStateAtom'
import { useAtom } from 'jotai'
import importConfigs from '@/import/config'
import type { ReactElement } from 'react'

const SidebarNavItem = ({
  name,
  url,
  icon,
}: {
  name: string
  url: string
  icon: React.ComponentType
}): ReactElement => {
  const Icon = icon
  const location = useLocation()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={`text-xs hover:bg-slate-150${location.pathname === url ? ' bg-slate-100' : ''}`}
      >
        <Link to={url}>
          <Icon />
          <span>{name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const SidebarCollapsibleSection = ({
  label,
  icon,
  closeByDefault,
  actions,
}: {
  label: string
  icon: React.ComponentType
  closeByDefault?: boolean
  actions: Array<
    | {
        name: string
        url: string
        icon: React.ComponentType
      }
    | undefined
  >
}) => {
  const Icon = icon
  const location = useLocation()
  const roots = Object.fromEntries(
    actions.filter((a) => a !== undefined).map((a) => [a!.url.split('/')[1], a!])
  )
  const active = roots[location.pathname.split('/')[1]] !== undefined
  return (
    <Collapsible
      key={label}
      defaultOpen={active || !closeByDefault}
      className={`group/collapsible ${active ? ' bg-slate-200' : ''}`}
    >
      <SidebarGroup>
        <SidebarGroupLabel asChild className="font-bold text-sm cursor-pointer open:bg-red-100">
          <CollapsibleTrigger className="flex items-center gap-2">
            <Icon /> {label}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {actions
                .filter((a) => a !== undefined)
                .map(
                  (action) =>
                    action && (
                      <SidebarNavItem
                        key={action.name}
                        name={action.name}
                        url={action.url}
                        icon={action.icon}
                      />
                    )
                )}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function AppSidebar() {
  const auth = useAuth()
  const [headerState] = useAtom(headerStateAtom)
  const navGroups = [
    {
      label: 'Documents',
      icon: Book,
      requiresAdmin: false,
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
      label: 'Relationships',
      icon: Group,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: 'List document relationships',
          icon: List,
          url: '/relationship',
        },
        {
          name: 'Create document relationship',
          icon: Plus,
          url: '/relationship/create',
        },
      ],
    },
    {
      label: 'Predicates',
      icon: BookA,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: 'List relationship predicates',
          icon: List,
          url: '/predicate',
        },
        {
          name: 'Create relationship predicate',
          icon: Plus,
          url: '/predicate/create',
        },
      ],
    },
    {
      label: 'Schemas',
      icon: Network,
      requiresAdmin: true,
      closeByDefault: true,
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
      closeByDefault: true,
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
      closeByDefault: true,
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
      closeByDefault: true,
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
        },
      ],
    },
    {
      label: 'Imports',
      icon: Import,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: 'All',
          icon: RotateCw,
          url: '/import/all',
        },
        {
          name: 'CSV',
          icon: FileSpreadsheet,
          url: '/import/csv',
        },
      ].concat(
        importConfigs.map((config) => {
          return {
            name: config.label,
            icon: config.icon,
            url: `/import/${config.type}`,
          }
        })
      ),
    },
  ]

  const sideBarStyle =
    headerState.height !== '0'
      ? { top: headerState.height, height: `calc(100% - ${headerState.height})` }
      : {}

  return (
    <Sidebar style={sideBarStyle}>
      <SidebarHeader />
      <SidebarContent className="gap-0">
        {navGroups
          .filter((group) => {
            if (group.requiresAdmin && !auth.isAdmin) {
              return false
            }
            return true
          })
          .map((group) => (
            <SidebarCollapsibleSection {...group} key={group.label} />
          ))}
      </SidebarContent>
      <SidebarFooter>
        <UserView />
      </SidebarFooter>
    </Sidebar>
  )
}
