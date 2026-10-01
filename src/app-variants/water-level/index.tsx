import type { AppVariantDefinition } from '@/variants/types'
import Header from '@/app-variants/water-level/header'
import WaterLevelEntry from '@/app-variants/water-level/entry'

export const appVariant = {
    id: 'water-level',
    branding: {
        siteTitle: 'Water Level',
    },
    components: {
        Header,
        HomePage: WaterLevelEntry,
    },
} satisfies AppVariantDefinition
