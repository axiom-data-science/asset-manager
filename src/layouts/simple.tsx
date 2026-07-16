import User from ***REMOVED***@/manage/components/user***REMOVED***
import headerStateAtom from ***REMOVED***@/state/headerStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***

const SimpleLayout = ({ children }: { children: React.ReactNode }) => {
  const [headerState] = useAtom(headerStateAtom)
  const style = headerState.height !== ***REMOVED***0***REMOVED*** ? { paddingTop: headerState.height } : {}
  return (
    <div className="w-full" style={style}>
      <main className="w-full">
        <div className="p-10 pt-4">{children}</div>
      </main>
      <div className="fixed left-2 bottom-2 z-50 bg-white shadow-md">
        <User />
      </div>
    </div>
  )
}

export default SimpleLayout
