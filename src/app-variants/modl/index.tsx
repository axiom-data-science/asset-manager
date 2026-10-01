import type { AppVariantDefinition } from '@/variants/types'
import MODLCreateDocumentEntry from '@/app-variants/modl/create_document_entry'
import MODLEntry from '@/app-variants/modl/entry'
import MODLHeader from '@/app-variants/modl/header'
import MODLLoginPage from '@/app-variants/modl/login_page'
import MODLCreateDocumentSuccess from './create_document_success'

export const appVariant = {
  id: 'modl',
  branding: {
    siteTitle: 'MODL Asset Manager',
  },
  components: {
    Header: MODLHeader,
    HomePage: MODLEntry,
    CreateDocumentEntry: MODLCreateDocumentEntry,
    LoginPage: MODLLoginPage,
    DocumentSuccessPage: MODLCreateDocumentSuccess,
  },
} satisfies AppVariantDefinition
