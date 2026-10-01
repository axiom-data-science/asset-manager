import { APPS_API_BASE_URL } from '@/config/config'
import type { ParsedCSV } from '@/lib/csv'
import { uploadFileToPostgrest } from '@/services/postgrest/services'
import { Inputs, type IFieldInputProps } from '@axdspub/axiom-ui-forms'
import type { ReactElement } from 'react'
import { useAuth } from 'react-oidc-context'

type FileUploadProps = IFieldInputProps & {
    acceptFileTypes?: string[]
    onFileUploaded?: (
        fileData: string | ArrayBuffer | undefined | null,
        csvData: ParsedCSV | null,
        fileName?: string
    ) => void
}

const FileUpload = ({
    acceptFileTypes,
    onFileUploaded,
    ...inputProps
}: FileUploadProps): ReactElement => {
    const auth = useAuth()

    return (
        <Inputs.FileUploadInput
            {...inputProps}
            acceptFileTypes={acceptFileTypes}
            onFileUpload={async ({ fileName, fileData, parsedCsvData, file }) => {
                onFileUploaded?.(fileData, parsedCsvData, fileName)

                const fileUuid = await uploadFileToPostgrest({
                    file,
                    token: auth.user?.access_token ?? '',
                })

                return `${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${fileUuid}`
            }}
            getPreviewUrl={(fileRef) => fileRef}
        />
    )
}

export default FileUpload