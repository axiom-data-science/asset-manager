import { APPS_API_BASE_URL } from '@/config/config'
import type { ParsedCSV } from '@/lib/csv'
import { uploadFileToPostgrest } from '@/services/postgrest/services'
import { Inputs, type IFieldInputProps } from '@axdspub/axiom-ui-forms'
import { useCallback, type ReactElement } from 'react'
import { useAuth } from 'react-oidc-context'
import { fetchDocumentUpload } from '../document/services'

type FileUploadProps = IFieldInputProps & {
    acceptFileTypes?: string[]
    onFileUploaded?: (
        fileData: string | ArrayBuffer | undefined | null,
        csvData: ParsedCSV | null,
        fileName?: string
    ) => void
}

const getFileUploadUUID = (fileRef: string): string | null => {
    if (fileRef.startsWith(`${APPS_API_BASE_URL}/rpc/get_document_file`) && fileRef.match(/uuid=([a-f0-9-]+)/)) {
        const uuidMatch = fileRef.match(/uuid=([a-f0-9-]+)/)
        const uuid = uuidMatch?.[1]
        return uuid ?? null
    }
    return null
}


const FileUpload = ({
    acceptFileTypes,
    onFileUploaded,
    ...inputProps
}: FileUploadProps): ReactElement => {
    const auth = useAuth()
    const getPreviewFile = useCallback(async (fileRef: string): Promise<File> => {

        const fileUploadUUID = getFileUploadUUID(fileRef)
        if (fileUploadUUID) {
            const fileOb = await fetchDocumentUpload({
                uuid: fileUploadUUID,
                token: auth.user?.access_token ?? '',
            })
            if (fileOb) {
                return fileOb
            }

        }




        const response = await fetch(fileRef)
        if (!response.ok) {
            throw new Error(`Could not load file preview. HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const disposition = response.headers.get('Content-Disposition')
        const fileName = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
            ?? new URL(fileRef, window.location.href).pathname.split('/').pop()
            ?? 'downloaded-file'
        const contentType = response.headers.get('Content-Type')?.split(';', 1)[0] ?? blob.type

        return new File([blob], fileName, { type: contentType })
    }, [auth.user?.access_token])

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
            getPreviewFile={getPreviewFile}
        />
    )
}

export default FileUpload