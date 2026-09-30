import { describe, expect, it } from 'vitest'
import { resolveAppVariantId } from './resolve'

describe('resolveAppVariantId', () => {
    it('prefers explicit runtime configuration', () => {
        expect(
            resolveAppVariantId({
                configuredVariant: ' Client-Two ',
                hostname: 'modl-asset.example.test',
                queryVariant: 'preview',
            })
        ).toBe('client-two')
    })

    it('preserves MODL hostname detection as a compatibility fallback', () => {
        expect(resolveAppVariantId({ hostname: 'modl-asset.example.test' })).toBe('modl')
    })

    it('uses the query variant when no configured or hostname variant exists', () => {
        expect(
            resolveAppVariantId({ hostname: 'localhost', queryVariant: ' Client-Two ' })
        ).toBe('client-two')
    })

    it('returns undefined when no variant is configured or detected', () => {
        expect(resolveAppVariantId({ hostname: 'localhost' })).toBeUndefined()
    })
})