import { describe, expect, it } from 'vitest'
import { appVariant } from './index'

describe('PAM CSV import view', () => {
    it('configures the known document sources and parent-child relationships', () => {
        const view = appVariant.csvImportViews?.find(({ id }) => id === 'pam-csv')

        expect(view).toMatchObject({
            path: '/import/csv/pam',
            config: {
                mapping: 'required',
                relationships: 'fixed',
                relationshipRules: [
                    {
                        parentObjectTypeSlug: 'pam_project',
                        childObjectTypeSlug: 'pam_site',
                        parentMatchField: 'project',
                        childMatchField: 'project',
                        predicate: 'has_parent',
                    },
                    {
                        parentObjectTypeSlug: 'pam_site',
                        childObjectTypeSlug: 'pam_deployment',
                        parentMatchField: 'siteOrCruiseName',
                        childMatchField: 'site',
                        predicate: 'has_parent',
                    },
                ],
                sourceConfigs: expect.arrayContaining([
                    expect.objectContaining({ key: 'pam-project', typeSlug: 'pam_project', role: 'parent' }),
                    expect.objectContaining({ key: 'pam-site', typeSlug: 'pam_site', role: 'child' }),
                    expect.objectContaining({ key: 'pam-deployment', typeSlug: 'pam_deployment', role: 'child' }),
                ]),
            },
        })

        expect(view?.config.sourceConfigs).toHaveLength(5)
        expect(view?.config.sourceConfigs?.every(({ typeKnown }) => typeKnown)).toBe(true)
    })

    it('targets recordings and analyses as arrays on each deployment', () => {
        const sources = appVariant.csvImportViews?.find(({ id }) => id === 'pam-csv')?.config.sourceConfigs

        expect(sources).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: 'pam-recordings',
                role: 'array',
                typeSlug: 'pam_deployment',
                arrayTarget: {
                    parentSourceKey: 'pam-deployment',
                    arrayFieldPath: 'recordings',
                    parentMatchField: 'deploymentTitle',
                    rowMatchField: 'deploymentTitle',
                },
            }),
            expect.objectContaining({
                key: 'pam-analyses',
                role: 'array',
                typeSlug: 'pam_deployment',
                arrayTarget: {
                    parentSourceKey: 'pam-deployment',
                    arrayFieldPath: 'analyses',
                    parentMatchField: 'deploymentTitle',
                    rowMatchField: 'deploymentTitle',
                },
            }),
        ]))
    })

    it('exposes the four site location branches and emits the discriminator field', () => {
        const config = appVariant.csvImportViews?.find(({ id }) => id === 'pam-csv')?.config

        expect(config?.relationshipPresentation).toBe('guided')
        expect(config?.relationshipRules).toEqual([
            expect.objectContaining({
                parentObjectTypeSlug: 'pam_project',
                childObjectTypeSlug: 'pam_site',
                existingParentPolicy: 'lookup',
            }),
            expect.objectContaining({
                parentObjectTypeSlug: 'pam_site',
                childObjectTypeSlug: 'pam_deployment',
                existingParentPolicy: 'lookup',
            }),
        ])
        expect(config?.sourceConfigs
            ?.filter(({ role }) => role !== 'array')
            .every(({ optional }) => optional)).toBe(true)
        expect(config?.schemaChoices).toEqual([
            expect.objectContaining({
                key: 'locationDetail',
                placeholder: 'Choose a site location type',
                options: [
                    { value: 'stationary_marine', label: 'Stationary marine' },
                    { value: 'stationary_terrestrial', label: 'Stationary terrestrial' },
                    { value: 'mobile_marine', label: 'Mobile marine' },
                    { value: 'multipoint_stationary_marine', label: 'Multipoint stationary marine' },
                ],
            }),
        ])
        expect(config?.sourceConfigs?.find(({ key }) => key === 'pam-site')).toMatchObject({
            schemaChoice: {
                key: 'locationDetail',
                branchPath: 'locationDetail',
                valuePath: 'locationDetail.type',
            },
        })
    })
})