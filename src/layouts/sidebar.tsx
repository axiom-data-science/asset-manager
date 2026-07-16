import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Tooltip } from '@axdspub/axiom-ui-utilities'
import { useAtom } from 'jotai'
import headerStateAtom from '@/state/headerStateAtom'

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [headerState] = useAtom(headerStateAtom)
  const triggerStyle = headerState.height !== '0' ? { top: headerState.height } : {}
  const mainStyle = headerState.height !== '0' ? { paddingTop: headerState.height } : {}
  return (
    <SidebarProvider className='h-full'>
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
