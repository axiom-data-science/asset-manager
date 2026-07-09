import { SidebarProvider, SidebarTrigger } from ***REMOVED***@/components/ui/sidebar***REMOVED***
import { AppSidebar } from ***REMOVED***@/components/app-sidebar***REMOVED***
import { Tooltip } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className=***REMOVED***h-full***REMOVED***>
      <AppSidebar />
      <main className="w-full h-full">
        <Tooltip content="Toggle sidebar" side="right" dark={true} useSpan={true}>
          <SidebarTrigger className="sticky top-0 z-50 cursor-pointer" />
        </Tooltip>
        <div className="p-10 pt-4 h-full">{children}</div>
      </main>
    </SidebarProvider>
  )
}
