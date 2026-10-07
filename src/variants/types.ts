import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react'
import type { CSVImportViewConfig } from '@/import/pages/csv'
import type { ICreateDocumentSuccessProps } from '@/manage/document/create_success'
import type { LucideProps } from 'lucide-react'

export type CreateDocumentEntryProps = {
    returnToOnSuccess?: string
    documentCreatePath?: string
}

export type AppVariantComponentProps = {
    HomePage: CreateDocumentEntryProps
    CreateDocumentEntry: CreateDocumentEntryProps
    Header: undefined
    DocumentSuccessPage: ICreateDocumentSuccessProps
    LoginPage: undefined
    LogoutPage: undefined
}

export type AppVariantComponents = {
    [K in keyof AppVariantComponentProps]?: ComponentType<
        AppVariantComponentProps[K] extends undefined
        ? Record<string, never>
        : AppVariantComponentProps[K]
    >
}

export type AppVariantBranding = {
    siteTitle: string
    favicon?: string
    logo?: string
    theme?: Record<string, string>
}

export type AppVariantNavigationItem = {
    id: string
    label: string
    path: string
}

export type AppVariantWorkflow = {
    id: string
    label: string
    path: string
    Component: ComponentType
}

export type KnownCSVImportView = {
    id: string
    label: string
    path: string
    icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
    config: CSVImportViewConfig
}

export type AppVariantDefinition = {
    id: string
    branding: AppVariantBranding
    components?: AppVariantComponents
    navigation?: readonly AppVariantNavigationItem[]
    workflows?: readonly AppVariantWorkflow[]
    csvImportViews?: readonly KnownCSVImportView[]
    features?: Readonly<Record<string, boolean>>
}