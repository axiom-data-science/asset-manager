import type { AppVariantDefinition } from '@/variants/types'
import Header from '@/app-variants/water-level/header'
import WaterLevelEntry from '@/app-variants/water-level/entry'
import WaterLevelCreateDocumentSuccess from '@/app-variants/water-level/create_document_success'
import WaterLevelLLoginPage from '@/app-variants/water-level/login_page'

export const appVariant = {
    id: 'water-level',
    branding: {
        siteTitle: 'Water Level',
    },
    components: {
        Header,
        HomePage: WaterLevelEntry,
        CreateDocumentEntry: WaterLevelEntry,
        DocumentSuccessPage: WaterLevelCreateDocumentSuccess,
        LoginPage: WaterLevelLLoginPage,
    },
} satisfies AppVariantDefinition
