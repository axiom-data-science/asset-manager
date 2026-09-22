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
} from ***REMOVED***lucide-react***REMOVED***
import { SidebarGroupContent, SidebarGroupLabel } from ***REMOVED***@/components/ui/sidebar***REMOVED***
import { Link, useLocation } from ***REMOVED***react-router-dom***REMOVED***

import UserView from ***REMOVED***@/manage/components/user***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import headerStateAtom from ***REMOVED***@/state/headerStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import importConfigs from ***REMOVED***@/import/config***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***

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
        className={`text-xs hover:bg-slate-150${location.pathname === url ? ***REMOVED*** bg-slate-100***REMOVED*** : ***REMOVED******REMOVED***}`}
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
    actions.filter((a) => a !== undefined).map((a) => [a!.url.split(***REMOVED***/***REMOVED***)[1], a!])
  )
  const active = roots[location.pathname.split(***REMOVED***/***REMOVED***)[1]] !== undefined
  return (
    <Collapsible
      key={label}
      defaultOpen={active || !closeByDefault}
      className={`group/collapsible ${active ? ***REMOVED*** bg-slate-200***REMOVED*** : ***REMOVED******REMOVED***}`}
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
      label: ***REMOVED***Documents***REMOVED***,
      icon: Book,
      requiresAdmin: false,
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
      label: ***REMOVED***Relationships***REMOVED***,
      icon: Group,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: ***REMOVED***List document relationships***REMOVED***,
          icon: List,
          url: ***REMOVED***/relationship***REMOVED***,
        },
        {
          name: ***REMOVED***Create document relationship***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/relationship/create***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Predicates***REMOVED***,
      icon: BookA,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: ***REMOVED***List relationship predicates***REMOVED***,
          icon: List,
          url: ***REMOVED***/predicate***REMOVED***,
        },
        {
          name: ***REMOVED***Create relationship predicate***REMOVED***,
          icon: Plus,
          url: ***REMOVED***/predicate/create***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Types and schemas***REMOVED***,
      icon: Network,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
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
      ],
    },
    {
      label: ***REMOVED***Forms***REMOVED***,
      icon: BookPlus,
      requiresAdmin: true,
      closeByDefault: true,
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
      requiresAdmin: true,
      closeByDefault: true,
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
      label: ***REMOVED***Examples***REMOVED***,
      icon: FilePen,
      requiresAdmin: false,
      closeByDefault: true,
      actions: [
        {
          name: ***REMOVED***List NINJA pipelines***REMOVED***,
          icon: List,
          url: ***REMOVED***/custom/pipelines***REMOVED***,
        },
        {
          name: ***REMOVED***Lock/unlock document***REMOVED***,
          icon: Lock,
          url: ***REMOVED***/examples/lock-unlock-documents***REMOVED***,
        },
        {
          name: ***REMOVED***Share document***REMOVED***,
          icon: Share,
          url: ***REMOVED***/examples/share-document***REMOVED***,
        },
        {
          name: ***REMOVED***List Authentik users***REMOVED***,
          icon: PersonStanding,
          url: ***REMOVED***/examples/authentik-users***REMOVED***,
        },
      ],
    },
    {
      label: ***REMOVED***Imports***REMOVED***,
      icon: Import,
      requiresAdmin: true,
      closeByDefault: true,
      actions: [
        {
          name: ***REMOVED***All***REMOVED***,
          icon: RotateCw,
          url: ***REMOVED***/import/all***REMOVED***,
        },
        {
          name: ***REMOVED***CSV***REMOVED***,
          icon: FileSpreadsheet,
          url: ***REMOVED***/import/csv***REMOVED***,
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
    headerState.height !== ***REMOVED***0***REMOVED***
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
