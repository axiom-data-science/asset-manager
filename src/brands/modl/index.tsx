import type { IBrand } from ***REMOVED***@/BrandComponents***REMOVED***
import MODLCreateDocumentEntry from ***REMOVED***@/brands/modl/create_document_entry***REMOVED***
import MODLEntry from ***REMOVED***@/brands/modl/entry***REMOVED***
import MODLHeader from ***REMOVED***@/brands/modl/header***REMOVED***
import MODLLoginPage from ***REMOVED***@/brands/modl/login_page***REMOVED***
import MODLCreateDocumentSuccess from ***REMOVED***./create_document_success***REMOVED***

export const MODLBrand: IBrand = {
  Header: MODLHeader,
  EntryPage: MODLEntry,
  CreateDocumentEntry: MODLCreateDocumentEntry,
  LoginPage: MODLLoginPage,
  DocumentSuccessPage: MODLCreateDocumentSuccess,
}
