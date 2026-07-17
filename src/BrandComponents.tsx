import MODLHeader from "@/brands/modl/Header"
import { MODLEntry } from "@/brands/modl/entry"
import { MODLCreateDocumentEntry } from "@/brands/modl/create_document_entry"
import type { ReactElement } from "react"
import type { ISelectDocumentFormProps } from "@/manage/document/create"


type IBrand = {
    EntryPage?: () => ReactElement
    CreateDocumentEntry?: (props: ISelectDocumentFormProps) => ReactElement
    Header?: () => ReactElement
    DocumentSuccessPage?: () => ReactElement
}

const BrandComponents: Record<string, IBrand> = {
    modl: {
        Header: MODLHeader,
        EntryPage: MODLEntry,
        CreateDocumentEntry: MODLCreateDocumentEntry
    }
}

export const getBrandComponent = (brand: string | undefined, component: keyof IBrand, props?: unknown): ReactElement | null => {
    if (brand === undefined) {
        return null
    }
    const brandKey = brand as keyof typeof BrandComponents
    if (brand && BrandComponents[brandKey] && BrandComponents[brandKey][component]) {
        return component === ***REMOVED***CreateDocumentEntry***REMOVED***
            ? BrandComponents[brandKey][component](props ?? {})
            : BrandComponents[brandKey][component]()
    }
    return null
}