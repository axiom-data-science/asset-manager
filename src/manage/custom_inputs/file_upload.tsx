import { APPS_API_BASE_URL } from '@/config/config'
import { uploadFileToPostgrest } from '@/services/postgrest/services'
import type { IFieldInputProps } from '@axdspub/axiom-ui-forms'
import { CloudUpload, X } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { useAuth } from 'react-oidc-context'
import { useDocument } from '../document/useDocument'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import Link from '../components/link'

const FileDisplay = ({ fileRef }: { fileRef: string }): ReactElement => {
  const url = new URL(fileRef)
  const uuid = url.searchParams.get('uuid')
  const { data, isLoading, error } = useDocument(uuid)
  return (
    <>
      {uuid === null ? <span className="text-red-500">Invalid file reference</span> : null}
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && (
          <>
            {String(data?.attrs?.mime_type).startsWith('image/') ? (
              <Link
                to={fileRef}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                <img src={url.toString()} className="max-w-md max-h-64 object-contain shadow-md" />
              </Link>
            ) : (
              <></>
            )}
            <Link
              to={fileRef}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View {data?.label ?? 'file'}
            </Link>
          </>
        )}
      </ViewWithLoader>
    </>
  )
}

const FileUpload = ({ field, value, onChange }: IFieldInputProps): ReactElement => {
  const [file, setFile] = useState<File | null>(null)
  const [fileRef, setFileRef] = useState<string | null>(
    value !== null && value !== undefined ? String(value) : null
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()

  const onUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fileUuid = await uploadFileToPostgrest({
        file,
        token: auth.user?.access_token || '',
      })
      const url = `${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${fileUuid}`
      setFileRef(url)
      onChange(url)
    } catch (error) {
      console.error('File upload failed:', error)
      setError(`File upload failed. ${(error as Error)?.message ?? ''}`)
    } finally {
      setUploading(false)
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null
    setFile(file)
  }
  return (
    <>
      <strong>{field.label}</strong>
      {field.description && <p className="text-sm text-gray-600 mb-2">{field.description}</p>}
      <label className="block">
        {error && <span className="text-red-500 text-sm mb-2 block">{error}</span>}
        <span className="sr-only">Choose profile photo</span>
        <input
          type="file"
          id="file_input"
          className="sr-only"
          disabled={file !== null}
          onChange={handleFileChange}
        />
        <div
          className={`px-4 py-2 rounded-lg cursor-pointer inline-block ${file !== null ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {uploading ? <span className="flex flex-row gap-1">Uploading ...</span> : 'Browse Files'}
        </div>
        {file && (
          <span className="ml-2 text-gray-700">
            {file.name}{' '}
            {!fileRef && (
              <CloudUpload
                className="inline-block ml-1 cursor-pointer"
                onClick={() => onUpload()}
              />
            )}
            <X
              className="inline-block ml-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setFile(null)
                setFileRef(null)
                onChange(null)
              }}
            />
          </span>
        )}
      </label>
      {fileRef && <FileDisplay fileRef={fileRef} />}
    </>
  )
}

export default FileUpload
