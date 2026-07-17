import { useEffect, useState, type ReactElement } from "react"
import { useAtom } from "jotai"
import headerStateAtom from "@/state/headerStateAtom"

const MODLHeader = (): ReactElement => {
    const [isScrolled, setIsScrolled] = useState(true);
    const [headerState, setHeaderState] = useAtom(headerStateAtom);

    useEffect(() => {
        setHeaderState((prevState) => ({
            ...prevState,
            height: ***REMOVED***6em***REMOVED***
        }));
        const handleScroll = () => {
            const limit = isScrolled ? 15 : 50
            if (window.scrollY > limit) { // Adjust 50px as your desired scroll threshold
                setHeaderState((prevState) => ({
                    ...prevState,
                    height: ***REMOVED***4em***REMOVED***
                }));
                setIsScrolled(true);
            } else {
                setHeaderState((prevState) => ({
                    ...prevState,
                    height: ***REMOVED***6em***REMOVED***
                }));
                setIsScrolled(false);
            }

        };

        window.addEventListener(***REMOVED***scroll***REMOVED***, handleScroll);

        return () => {
            window.removeEventListener(***REMOVED***scroll***REMOVED***, handleScroll);
        };
    }, []);
    const style = headerState.height !== ***REMOVED***0***REMOVED*** ? { height: isScrolled ? ***REMOVED***3em***REMOVED*** : ***REMOVED***5em***REMOVED*** } : {}
    return (
        <>
            <div className={`fixed top-0 left-0 right-0 flex items-center justify-between space-x-2 bg-[#003087] z-50 shadow-lg ${isScrolled ? ***REMOVED***py-2 px-6***REMOVED*** : ***REMOVED***py-3 px-6***REMOVED***}`} style={style}>
                <a href="https://ioos.us" target="_blank" rel="noopener noreferrer">
                    <img src="/ioos_logo_teal.png" alt="IOOS Logo" className={`transition-all duration-300 ${isScrolled ? ***REMOVED***h-8***REMOVED*** : ***REMOVED***h-12***REMOVED***} w-auto`} />
                </a>
                <div className="text-white text-sm font-semibold flex flex-col items-center space-y-1 w-30">
                    <img src="/buoy-retriever.png" alt="Buoy Retriever Logo" className={`transition-all duration-300 ${isScrolled ? ***REMOVED***h-8***REMOVED*** : ***REMOVED***h-10***REMOVED***} w-auto`} />
                    <p className={`transition-all duration-300 ${isScrolled ? ***REMOVED***hidden***REMOVED*** : ***REMOVED******REMOVED***}`}>
                        Buoy Retriever
                    </p>

                </div>
            </div>
        </>
    )
}

export default MODLHeader