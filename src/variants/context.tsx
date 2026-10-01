import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react'
import { getAppVariantId } from '@/lib/utils'
import { loadAppVariantDefinition } from './registry'
import type { AppVariantDefinition } from './types'
import { Loader } from '@axdspub/axiom-ui-utilities'

type AppVariantContextValue = {
    variantId?: string
    definition?: AppVariantDefinition
}

const AppVariantContext = createContext<AppVariantContextValue | undefined>(undefined)

export const AppVariantProvider = ({ children }: { children: ReactNode }): ReactElement => {
    const variantId = getAppVariantId()
    const [definition, setDefinition] = useState<AppVariantDefinition>()
    const [isLoading, setIsLoading] = useState(Boolean(variantId))
    const [error, setError] = useState<Error>()

    useEffect(() => {
        let active = true
        setDefinition(undefined)
        setError(undefined)
        setIsLoading(Boolean(variantId))

        void loadAppVariantDefinition(variantId)
            .then((loadedDefinition) => {
                if (!active) return
                setDefinition(loadedDefinition)
                setIsLoading(false)
            })
            .catch((loadError: unknown) => {
                if (!active) return
                setError(loadError instanceof Error ? loadError : new Error(String(loadError)))
                setIsLoading(false)
            })

        return () => {
            active = false
        }
    }, [variantId])

    if (isLoading) {
        return <Loader className='pt-10' />
    }

    if (error) {
        return (
            <div className="p-6 text-sm text-red-700" role="alert">
                Could not load application variant: {error.message}
            </div>
        )
    }

    return (
        <AppVariantContext.Provider value={{ variantId, definition }}>
            {children}
        </AppVariantContext.Provider>
    )
}

export const useAppVariant = (): AppVariantContextValue => {
    const context = useContext(AppVariantContext)
    if (!context) throw new Error('useAppVariant must be used within AppVariantProvider.')
    return context
}