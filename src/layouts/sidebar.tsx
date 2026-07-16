import { SidebarProvider, SidebarTrigger } from ***REMOVED***@/components/ui/sidebar***REMOVED***
import { AppSidebar } from ***REMOVED***@/components/app-sidebar***REMOVED***
import { Tooltip } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import headerStateAtom from ***REMOVED***@/state/headerStateAtom***REMOVED***

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [headerState] = useAtom(headerStateAtom)
  const triggerStyle = headerState.height !== ***REMOVED***0***REMOVED*** ? { top: headerState.height } : {}
  const mainStyle = headerState.height !== ***REMOVED***0***REMOVED*** ? { paddingTop: headerState.height } : {}
  return (
    <SidebarProvider className=***REMOVED***h-full***REMOVED***>
      <AppSidebar />
      <main className="w-full h-full" style={mainStyle}>
        <Tooltip content="Toggle sidebar" side="right" dark={true} useSpan={true}>
          <SidebarTrigger className="sticky z-50 cursor-pointer" style={triggerStyle} />
        </Tooltip>
        <div className="p-10 pt-4 h-full">{children}</div>
      </main>
    </SidebarProvider>
  )
}
