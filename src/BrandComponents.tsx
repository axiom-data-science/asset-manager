import type { ReactElement } from "react"
import { MODLBrand } from "@/brands/modl"
import type { MODLCreateDocumentEntryProps } from "@/brands/modl/create_document_entry"

type BrandComponent<Props = Record<string, never>> = (props?: Props) => ReactElement

export type BrandComponentProps = {
    EntryPage: MODLCreateDocumentEntryProps
    CreateDocumentEntry: MODLCreateDocumentEntryProps
    Header: undefined
    DocumentSuccessPage: undefined
    LoginPage: undefined
    LogoutPage: undefined
}

type BrandComponentArgs<K extends keyof BrandComponentProps> =
    BrandComponentProps[K] extends undefined
    ? []
    : [props: BrandComponentProps[K]]

export type IBrand = {
    [K in keyof BrandComponentProps]?: BrandComponent<BrandComponentProps[K]>
}

const BrandComponents: Record<string, IBrand> = {
    modl: MODLBrand
}

export const getBrandComponent = <K extends keyof IBrand>(
    brand: string | undefined,
    component: K,
    ...args: BrandComponentArgs<K>
): ReactElement | null => {
    if (brand === undefined) {
        return null
    }
    const brandKey = brand as keyof typeof BrandComponents
    if (brand && BrandComponents[brandKey] && BrandComponents[brandKey][component]) {
        const componentFn = BrandComponents[brandKey][component] as BrandComponent<BrandComponentProps[K]>
        return componentFn(args[0])
    }
    return null
}