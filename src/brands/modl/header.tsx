import { useEffect, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import headerStateAtom from ***REMOVED***@/state/headerStateAtom***REMOVED***
import { Link } from ***REMOVED***react-router-dom***REMOVED***

const MODLHeader = (): ReactElement => {
  const [isScrolled, setIsScrolled] = useState(true)
  const [headerState, setHeaderState] = useAtom(headerStateAtom)
  const headerHeight = ***REMOVED***5.5em***REMOVED***
  const scrolledHeaderHeight = ***REMOVED***3em***REMOVED***

  useEffect(() => {
    setHeaderState((prevState) => ({
      ...prevState,
      height: isScrolled ? scrolledHeaderHeight : headerHeight,
    }))
    return
    const handleScroll = () => {
      const limit = 50
      if (window.scrollY > limit) {
        // Adjust 50px as your desired scroll threshold
        setHeaderState((prevState) => ({
          ...prevState,
          height: scrolledHeaderHeight,
        }))
        setIsScrolled(true)
      } else {
        setHeaderState((prevState) => ({
          ...prevState,
          height: headerHeight,
        }))
        setIsScrolled(false)
      }
    }

    window.addEventListener(***REMOVED***scroll***REMOVED***, handleScroll)

    return () => {
      window.removeEventListener(***REMOVED***scroll***REMOVED***, handleScroll)
    }
  }, [setHeaderState])
  const style =
    headerState.height !== ***REMOVED***0***REMOVED*** ? { height: isScrolled ? scrolledHeaderHeight : headerHeight } : {}
  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 flex items-center justify-between space-x-2 bg-[#003087] z-50 shadow-lg ${isScrolled ? ***REMOVED***py-2 px-6***REMOVED*** : ***REMOVED***py-3 px-6***REMOVED***}`}
        style={style}
      >
        <a href="https://ioos.us" target="_blank" rel="noopener noreferrer">
          <img
            src="/ioos_logo_teal.png"
            alt="IOOS Logo"
            className={`transition-all duration-300 ${isScrolled ? ***REMOVED***h-8***REMOVED*** : ***REMOVED***h-12***REMOVED***} w-auto`}
          />
        </a>
        <div className="text-white text-sm font-semibold flex flex-col items-center space-y-1 w-30">
          <Link className="cursor-pointer" to="/">
            <img
              src="/buoy-retriever.png"
              alt="Buoy Retriever Logo"
              className={`transition-all duration-300 ${isScrolled ? ***REMOVED***h-8***REMOVED*** : ***REMOVED***h-10***REMOVED***} w-auto`}
            />
            <p className={`transition-all duration-300 ${isScrolled ? ***REMOVED***hidden***REMOVED*** : ***REMOVED******REMOVED***}`}>
              Buoy Retriever
            </p>
          </Link>
        </div>
      </div>
    </>
  )
}

export default MODLHeader
