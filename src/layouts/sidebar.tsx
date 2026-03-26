import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className=***REMOVED***w-full***REMOVED***>
        <SidebarTrigger className=***REMOVED***sticky top-0 z-50***REMOVED*** />
        {children}
      </main>
    </SidebarProvider>
  )
}