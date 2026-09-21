import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Tooltip } from '@axdspub/axiom-ui-utilities'
import { useAtom } from 'jotai'
import headerStateAtom from '@/state/headerStateAtom'
import { cn } from '@/lib/utils'

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
    headerState.height !== '0' ? { top: `calc(${headerState.height} + 5px)` } : {}
  const mainStyle = headerState.height !== '0' ? { paddingTop: headerState.height } : {}
  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <main className={cn('w-full h-full', mainClassName)} style={mainStyle}>
        <span className="sticky top-2 z-50 cursor-pointer" style={triggerStyle}>
          <Tooltip content="Toggle sidebar" side="right" dark={true} useSpan={true}>
            <SidebarTrigger />
          </Tooltip>
        </span>
        <div className={cn('p-10 pt-4 h-full', contentClassName)}>{children}</div>
      </main>
    </SidebarProvider>
  )
}
