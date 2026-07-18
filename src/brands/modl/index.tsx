import type { IBrand } from "@/BrandComponents";
import MODLCreateDocumentEntry from "@/brands/modl/create_document_entry";
import MODLEntry from "@/brands/modl/entry";
import MODLHeader from "@/brands/modl/header";
import MODLLoginPage from "@/brands/modl/login_page";

export const MODLBrand: IBrand = {
    Header: MODLHeader,
    EntryPage: MODLEntry,
    CreateDocumentEntry: MODLCreateDocumentEntry,
    LoginPage: MODLLoginPage
}