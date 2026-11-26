import { useAuth } from '@/auth/useAuth'
import { parseCSV, type ParsedCSV } from '@/lib/csv'
import { fetchDocumentUpload } from '@/manage/document/services'
import { FileUploadPreview } from '@axdspub/axiom-ui-forms'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactElement } from 'react'

type FileTypeFlags = {
  lowerName: string
  isImage: boolean
  isVideo: boolean
  isAudio: boolean
  isPdf: boolean
  isCsv: boolean
  isText: boolean
  isGeojson: boolean
}

const getFileTypeFlags = (file: File): FileTypeFlags => {
  const lowerName = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return {
    lowerName,
    isImage: type.startsWith('image/'),
    isVideo: type.startsWith('video/'),
    isAudio: type.startsWith('audio/'),
    isPdf: type.includes('pdf') || lowerName.endsWith('.pdf'),
    isCsv: type.includes('csv') || lowerName.endsWith('.csv'),
    isText: type.startsWith('text/') || /\.(txt|md|csv|log)$/i.test(lowerName),
    isGeojson:
      type === 'application/geo+json' || type.includes('geojson') || lowerName.endsWith('.geojson'),
  }
}

const PreviewFile = ({ file }: { file: File }): ReactElement => {
  const fileType = getFileTypeFlags(file)
  const [csvPreview, setCsvPreview] = useState<{ file: File; data: ParsedCSV } | null>(null)
  const [csvError, setCsvError] = useState<{ file: File; message: string } | null>(null)

  useEffect(() => {
    if (!fileType.isCsv) return

    let active = true
    file
      .text()
      .then(parseCSV)
      .then((data) => {
        if (active) setCsvPreview({ file, data })
      })
      .catch((error: unknown) => {
        if (active) {
          setCsvError({
            file,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      active = false
    }
  }, [file, fileType.isCsv])

  const fileCsvError = csvError?.file === file ? csvError.message : null
  if (fileCsvError) {
    return <p className="p-4 text-sm text-red-700" role="alert">Unable to preview CSV: {fileCsvError}</p>
  }

  return (
    <FileUploadPreview
      file={file}
      previewUrl={null}
      csvData={csvPreview?.file === file ? csvPreview.data : null}
      fileType={fileType}
    />
  )
}

const DocumentFilePreview = ({ documentUuid }: { documentUuid: string }): ReactElement => {
  const auth = useAuth()
  const token = auth.user?.access_token
  const {
    data: file,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['document_file_preview', documentUuid, auth.user?.profile?.sub],
    queryFn: ({ signal }) =>
      fetchDocumentUpload({
        uuid: documentUuid,
        token: token ?? '',
        signal,
      }),
    enabled: Boolean(documentUuid && token),
  })

  return (
    <section className="min-w-0 rounded border bg-slate-50">
      <h2 className="border-b bg-white px-4 py-2 text-lg font-semibold">Preview</h2>
      {isLoading ? (
        <p className="p-4 text-sm text-slate-600">Loading preview...</p>
      ) : error ? (
        <p className="p-4 text-sm text-red-700" role="alert">
          Unable to load preview: {error instanceof Error ? error.message : String(error)}
        </p>
      ) : file ? (
        <PreviewFile file={file} />
      ) : (
        <p className="p-4 text-sm text-slate-600">No file is available to preview.</p>
      )}
    </section>
  )
}

export default DocumentFilePreview
