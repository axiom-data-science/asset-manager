export type AppVariantResolutionInput = {
    configuredVariant?: string
    hostname?: string
    queryVariant?: string
}

const normalizeVariantId = (value: string | undefined): string | undefined => {
    const normalized = value?.trim().toLowerCase()
    return normalized || undefined
}

export const resolveAppVariantId = ({
    configuredVariant,
    hostname,
    queryVariant,
}: AppVariantResolutionInput): string | undefined => {
    const configured = normalizeVariantId(configuredVariant)
    if (configured) return configured

    if (hostname?.toLowerCase().includes('modl-asset')) return 'modl'

    return normalizeVariantId(queryVariant)
}