import type { AppVariantDefinition } from '@/variants/types'
import Header from '@/app-variants/pam/header'
import WaterLevelEntry from '@/app-variants/pam/entry'

export const appVariant = {
    id: 'pam',
    branding: {
        siteTitle: 'Water Level',
    },
    components: {
        Header,
        HomePage: WaterLevelEntry,
    },
    csvImportViews: [
        {
            id: 'pam-csv',
            label: 'PAM project import',
            path: '/import/csv/pam',
            config: {
                mapping: 'required',
                relationships: 'fixed',
                entryChoices: [
                    {
                        key: 'locationDetail',
                        label: 'PAM site location type',
                        options: [
                            { value: 'stationary_marine', label: 'Stationary marine' },
                            { value: 'stationary_terrestrial', label: 'Stationary terrestrial' },
                            { value: 'mobile_marine', label: 'Mobile marine' },
                            {
                                value: 'multipoint_stationary_marine',
                                label: 'Multipoint stationary marine',
                            },
                        ],
                    },
                ],
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
                sourceConfigs: [
                    {
                        key: 'pam-project',
                        label: 'Projects',
                        description: 'Upload the PAM project CSV.',
                        fileName: 'pam_project.csv',
                        typeSlug: 'pam_project',
                        typeKnown: true,
                        mapping: 'required',
                        role: 'parent',
                        relationshipFields: ['project'],
                    },
                    {
                        key: 'pam-site',
                        label: 'Sites',
                        description: 'Choose the site location type, then upload the PAM site CSV.',
                        fileName: 'pam_site.csv',
                        typeSlug: 'pam_site',
                        typeKnown: true,
                        mapping: 'required',
                        role: 'child',
                        relationshipFields: ['project', 'siteOrCruiseName'],
                        entryChoiceKey: 'locationDetail',
                        entryChoiceSchemaPath: 'locationDetail',
                        entryChoiceFieldPath: 'locationDetail.type',
                    },
                    {
                        key: 'pam-deployment',
                        label: 'Deployments',
                        description: 'Upload the PAM deployment CSV.',
                        fileName: 'pam_deployment.csv',
                        typeSlug: 'pam_deployment',
                        typeKnown: true,
                        mapping: 'required',
                        role: 'child',
                        relationshipFields: ['site', 'deploymentTitle'],
                    },
                    {
                        key: 'pam-recordings',
                        label: 'Recording array items',
                        description: 'Rows are embedded in each deployment’s recordings array.',
                        fileName: 'pam_recordings.csv',
                        typeSlug: 'pam_deployment',
                        typeKnown: true,
                        mapping: 'required',
                        role: 'array',
                        relationshipFields: ['deploymentTitle'],
                        arrayTarget: {
                            parentSourceKey: 'pam-deployment',
                            arrayFieldPath: 'recordings',
                            parentMatchField: 'deploymentTitle',
                            rowMatchField: 'deploymentTitle',
                        },
                    },
                    {
                        key: 'pam-analyses',
                        label: 'Analysis array items',
                        description: 'Rows are embedded in each deployment’s analyses array.',
                        fileName: 'pam_analyses.csv',
                        typeSlug: 'pam_deployment',
                        typeKnown: true,
                        mapping: 'required',
                        role: 'array',
                        relationshipFields: ['deploymentTitle'],
                        arrayTarget: {
                            parentSourceKey: 'pam-deployment',
                            arrayFieldPath: 'analyses',
                            parentMatchField: 'deploymentTitle',
                            rowMatchField: 'deploymentTitle',
                        },
                    },
                ],
            },
        },
    ],
} satisfies AppVariantDefinition
