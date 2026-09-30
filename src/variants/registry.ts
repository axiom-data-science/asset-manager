import { MODLComponents } from '@/app-variants/modl'
import type { AppVariantDefinition } from './types'

export const appVariants = {
    modl: {
        id: 'modl',
        branding: {
            siteTitle: 'MODL Asset Manager',
        },
        components: MODLComponents,
    },
} satisfies Record<string, AppVariantDefinition>

export const getAppVariantDefinition = (
    variantId: string | undefined
): AppVariantDefinition | undefined => {
    if (!variantId) return undefined
    return appVariants[variantId as keyof typeof appVariants]
}