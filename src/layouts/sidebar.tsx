import { SidebarProvider, SidebarTrigger } from ***REMOVED***@/components/ui/sidebar***REMOVED***
import { AppSidebar } from ***REMOVED***@/components/app-sidebar***REMOVED***
import { Tooltip } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import headerStateAtom from ***REMOVED***@/state/headerStateAtom***REMOVED***
import { cn } from ***REMOVED***@/lib/utils***REMOVED***

export default function SidebarLayout({
  children,
  mainClassName,
  contentClassName,
}: {
  children: React.ReactNode
  mainClassName?: string
  contentClassName?: string
}) {
  const [headerState] = useAtom(headerStateAtom)
  const triggerStyle =
    headerState.height !== ***REMOVED***0***REMOVED*** ? { top: `calc(${headerState.height} + 5px)` } : {}
  const mainStyle = headerState.height !== ***REMOVED***0***REMOVED*** ? { paddingTop: headerState.height } : {}
  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <main className={cn(***REMOVED***w-full h-full***REMOVED***, mainClassName)} style={mainStyle}>
        <span className="sticky top-2 z-50 cursor-pointer" style={triggerStyle}>
          <Tooltip content="Toggle sidebar" side="right" dark={true} useSpan={true}>
            <SidebarTrigger />
          </Tooltip>
        </span>
        <div className={cn(***REMOVED***p-10 pt-4 h-full***REMOVED***, contentClassName)}>{children}</div>
      </main>
    </SidebarProvider>
  )
}
