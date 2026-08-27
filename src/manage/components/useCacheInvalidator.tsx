import contextStateAtom, { contextReloadTokenAtom } from "@/state/contextStateAtom"
import { useQueryClient } from "@tanstack/react-query"
import { useAtom } from "jotai"

const useCacheInvalidator = ({
    queryKey
}: {
    queryKey: string[]
}) => {
    const queryClient = useQueryClient()
    const [, setContextReloadToken] = useAtom(contextReloadTokenAtom)
    const [context] = useAtom(contextStateAtom)
    const invalidateCache = () => {
        queryClient.invalidateQueries({ queryKey })
        const keys = Object.keys(context)
        const inContext = queryKey.find((key) => keys.includes(key))
        if (inContext) {
            setContextReloadToken((prev) => prev + 1)
        }
    }
    return invalidateCache
}

export default useCacheInvalidator