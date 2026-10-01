// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { loadAppVariantDefinition } from './registry'

describe('app variant registry', () => {
    it(
        'loads the existing MODL variant',
        async () => {
            const variant = await loadAppVariantDefinition('modl')

            expect(variant?.id).toBe('modl')
            expect(variant?.components?.HomePage).toBeDefined()
            expect(variant?.components?.CreateDocumentEntry).toBeDefined()
        },
        15_000
    )

    it('returns no definition for an unknown variant', async () => {
        await expect(loadAppVariantDefinition('unknown')).resolves.toBeUndefined()
    })

    it('returns the cached promise after a variant is first requested', () => {
        const firstLoad = loadAppVariantDefinition('modl')
        const secondLoad = loadAppVariantDefinition('modl')

        expect(secondLoad).toBe(firstLoad)
    })
})