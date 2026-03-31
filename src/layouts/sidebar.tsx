import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Tooltip } from "@axdspub/axiom-ui-utilities"

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className=***REMOVED***w-full***REMOVED***>
        <Tooltip content="Toggle sidebar" side="right" dark={true} useSpan={true}>
          <SidebarTrigger className=***REMOVED***sticky top-0 z-50 cursor-pointer***REMOVED*** />
        </Tooltip>
        <div className=***REMOVED***p-10 pt-4***REMOVED***>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}