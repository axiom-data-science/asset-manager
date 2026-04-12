import { APPS_API_BASE_URL } from ***REMOVED***@/config/config***REMOVED***
import { uploadFileToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IFieldInputProps } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { CloudUpload, X } from ***REMOVED***lucide-react***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useAuth } from ***REMOVED***react-oidc-context***REMOVED***
import { useDocument } from ***REMOVED***../document/useDocument***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import Link from ***REMOVED***../components/link***REMOVED***

const FileDisplay = ({ fileRef }: { fileRef: string }): ReactElement => {
  const url = new URL(fileRef)
  const uuid = url.searchParams.get(***REMOVED***uuid***REMOVED***)
  const { data, isLoading, error } = useDocument(uuid)
  return (
    <>
      {uuid === null ? <span className="text-red-500">Invalid file reference</span> : null}
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && (
          <>
            {String(data?.attrs?.mime_type).startsWith(***REMOVED***image/***REMOVED***) ? (
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
              View {data?.label ?? ***REMOVED***file***REMOVED***}
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
        token: auth.user?.access_token || ***REMOVED******REMOVED***,
      })
      const url = `${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${fileUuid}`
      setFileRef(url)
      onChange(url)
    } catch (error) {
      console.error(***REMOVED***File upload failed:***REMOVED***, error)
      setError(`File upload failed. ${(error as Error)?.message ?? ***REMOVED******REMOVED***}`)
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
          className={`px-4 py-2 rounded-lg cursor-pointer inline-block ${file !== null ? ***REMOVED***bg-slate-200 text-slate-400***REMOVED*** : ***REMOVED***bg-blue-600 hover:bg-blue-700 text-white***REMOVED***}`}
        >
          {uploading ? <span className="flex flex-row gap-1">Uploading ...</span> : ***REMOVED***Browse Files***REMOVED***}
        </div>
        {file && (
          <span className="ml-2 text-gray-700">
            {file.name}{***REMOVED*** ***REMOVED***}
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
