// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { getAppVariantDefinition } from './registry'

describe('app variant registry', () => {
    it('provides the existing MODL variant', () => {
        const variant = getAppVariantDefinition('modl')

        expect(variant?.id).toBe('modl')
        expect(variant?.components?.HomePage).toBeDefined()
        expect(variant?.components?.CreateDocumentEntry).toBeDefined()
    })

    it('returns no definition for an unknown variant', () => {
        expect(getAppVariantDefinition('unknown')).toBeUndefined()
    })
})