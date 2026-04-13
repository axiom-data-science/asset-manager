import User from ***REMOVED***@/manage/components/user***REMOVED***

const SimpleLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full">
      <main className="w-full">
        <div className="p-10 pt-4">{children}</div>
      </main>
      <div className="fixed left-2 bottom-2 z-50">
        <User />
      </div>
    </div>
  )
}

export default SimpleLayout
