import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Tooltip } from '@axdspub/axiom-ui-utilities'

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className='h-full'>
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
