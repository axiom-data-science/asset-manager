import type { AppVariantDefinition } from './types'

type AppVariantModule = {
    appVariant: AppVariantDefinition
}

type AppVariantLoader = () => Promise<AppVariantModule>

export const appVariantLoaders = {
    modl: () => import('@/app-variants/modl'),
    'water-level': () => import('@/app-variants/water-level'),
    pam: () => import('@/app-variants/pam'),
} satisfies Record<string, AppVariantLoader>

const appVariantCache = new Map<string, Promise<AppVariantDefinition | undefined>>()

export const loadAppVariantDefinition = (
    variantId: string | undefined
): Promise<AppVariantDefinition | undefined> => {
    if (!variantId) return Promise.resolve(undefined)

    const cached = appVariantCache.get(variantId)
    if (cached) return cached

    const loader = appVariantLoaders[variantId as keyof typeof appVariantLoaders]
    if (!loader) return Promise.resolve(undefined)

    const pending = loader().then(({ appVariant }) => appVariant)
    appVariantCache.set(variantId, pending)
    return pending
}