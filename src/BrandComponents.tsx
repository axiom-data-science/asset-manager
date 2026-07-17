import type { ReactElement } from "react"
import type { ISelectDocumentFormProps } from "@/manage/document/create"
import { MODLBrand } from "@/brands/modl"


export type IBrand = {
    EntryPage?: () => ReactElement
    CreateDocumentEntry?: (props: ISelectDocumentFormProps) => ReactElement
    Header?: () => ReactElement
    DocumentSuccessPage?: () => ReactElement
}

const BrandComponents: Record<string, IBrand> = {
    modl: MODLBrand
}

export const getBrandComponent = (brand: string | undefined, component: keyof IBrand, props?: unknown): ReactElement | null => {
    if (brand === undefined) {
        return null
    }
    const brandKey = brand as keyof typeof BrandComponents
    if (brand && BrandComponents[brandKey] && BrandComponents[brandKey][component]) {
        return component === 'CreateDocumentEntry'
            ? BrandComponents[brandKey][component](props ?? {})
            : BrandComponents[brandKey][component]()
    }
    return null
}