import { useEffect, useState, type ReactElement } from 'react'
import { useAtom } from 'jotai'
import headerStateAtom from '@/state/headerStateAtom'
import { Link } from 'react-router-dom'

const MODLHeader = (): ReactElement => {
  const [isScrolled, setIsScrolled] = useState(true)
  const [headerState, setHeaderState] = useAtom(headerStateAtom)
  const headerHeight = '5.5em'
  const scrolledHeaderHeight = '3em'

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

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [setHeaderState])
  const style =
    headerState.height !== '0' ? { height: isScrolled ? scrolledHeaderHeight : headerHeight } : {}
  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 flex items-center justify-between space-x-2 bg-[#003087] z-50 shadow-lg ${isScrolled ? 'py-2 px-6' : 'py-3 px-6'}`}
        style={style}
      >
        <a href="https://ioos.us" target="_blank" rel="noopener noreferrer">
          <img
            src="/ioos_logo_teal.png"
            alt="IOOS Logo"
            className={`transition-all duration-300 ${isScrolled ? 'h-8' : 'h-12'} w-auto`}
          />
        </a>
        <div className="text-white text-sm font-semibold flex flex-col items-center space-y-1 w-30">
          <Link className="cursor-pointer" to="/">
            <img
              src="/buoy-retriever.png"
              alt="Buoy Retriever Logo"
              className={`transition-all duration-300 ${isScrolled ? 'h-8' : 'h-10'} w-auto`}
            />
            <p className={`transition-all duration-300 ${isScrolled ? 'hidden' : ''}`}>
              Buoy Retriever
            </p>
          </Link>
        </div>
      </div>
    </>
  )
}

export default MODLHeader
