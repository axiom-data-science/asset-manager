import type { AppVariantDefinition } from '@/variants/types'
import Header from '@/app-variants/pam/header'
import WaterLevelEntry from '@/app-variants/pam/entry'

export const appVariant = {
    id: 'pam',
    branding: {
        siteTitle: 'Water Level',
    },
    components: {
        Header,
        HomePage: WaterLevelEntry,
    },
} satisfies AppVariantDefinition
