import { get } from 'lodash-es'
import type { IFormValues } from '@axdspub/axiom-ui-forms'

export const getDocumentMetadata = ({
    formValues,
    valuesToSave,
    labelPath,
    descriptionPath,
}: {
    formValues: IFormValues
    valuesToSave: IFormValues
    labelPath?: string
    descriptionPath?: string
}) => {
    const defaultLabel =
        formValues.label ??
        formValues.title ??
        formValues.platform_name ??
        formValues.station_label ??
        'Untitled Document'
    const defaultDescription = formValues.description ?? ''

    return {
        label: labelPath ? get(valuesToSave, labelPath, defaultLabel) : defaultLabel,
        description: descriptionPath
            ? get(valuesToSave, descriptionPath, defaultDescription)
            : defaultDescription,
    }
}