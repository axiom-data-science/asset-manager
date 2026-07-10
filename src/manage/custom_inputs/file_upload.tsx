import { APPS_API_BASE_URL } from ***REMOVED***@/config/config***REMOVED***
import { parseCSV, type ParsedCSV } from ***REMOVED***@/lib/csv***REMOVED***
import { uploadFileToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import type { IFieldInputProps } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { CloudUpload, File, X } from ***REMOVED***lucide-react***REMOVED***
import { useState, useRef, type ReactElement } from ***REMOVED***react***REMOVED***
import { useAuth } from ***REMOVED***react-oidc-context***REMOVED***
import { useDocument } from ***REMOVED***../document/useDocument***REMOVED***
import { utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
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
            {String((data?.attrs as { mime_type: string })?.mime_type).startsWith(***REMOVED***image/***REMOVED***) ? (
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

const FileUpload = ({
  field,
  value,
  onChange,
  acceptFileTypes,
  onFileUploaded,
}: IFieldInputProps & {
  acceptFileTypes?: string[]
  onFileUploaded?: (
    fileData: string | ArrayBuffer | undefined | null,
    csvData: ParsedCSV | null
  ) => void
}): ReactElement => {
  const [file, setFile] = useState<File | null>(null)
  const [fileRef, setFileRef] = useState<string | null>(
    value !== null && value !== undefined ? String(value) : null
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onUpload = async (f?: File | null) => {
    const _file = f ?? file
    if (!_file) return
    setUploading(true)
    try {
      const reader = new FileReader()

      // This event fires when the file reading is complete
      reader.onload = function (event) {
        const text = event.target?.result
        if (typeof text === ***REMOVED***string***REMOVED***) {
          const data = parseCSV(text)
          if (onFileUploaded) {
            onFileUploaded(text, data)
          }
        } else if (onFileUploaded) {
          onFileUploaded(event.target?.result, null)
        }
      }

      // Read the file object as a plain text string
      reader.readAsText(_file)
      const fileUuid = await uploadFileToPostgrest({
        file: _file,
        token: auth.user?.access_token || ***REMOVED******REMOVED***,
      })
      const url = `${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${fileUuid}`
      setFileRef(url)
      onChange(url)
      // Clear the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ***REMOVED******REMOVED***
      }
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
    onUpload(file)
  }
  return (
    <div className="flex flex-col gap-2">
      <p>{field.label}</p>
      {field.description && <p className="text-sm text-gray-600 mb-2">{field.description}</p>}

      <label className="block">
        {error && <span className="text-red-500 text-sm mb-2 block">{error}</span>}
        <span className="sr-only">Choose profile photo</span>
        <input
          type="file"
          id="file_input"
          ref={fileInputRef}
          className="sr-only"
          disabled={file !== null}
          onChange={handleFileChange}
          accept={acceptFileTypes ? acceptFileTypes.join(***REMOVED***, ***REMOVED***) : undefined}
        />
        {!fileRef && (
          <div
            className={`${utils.createButtonClass({
              size: ***REMOVED***sm***REMOVED***,
              variant: ***REMOVED***create***REMOVED***,
            })} px-4 py-2 rounded-lg cursor-pointer inline-block ${file !== null ? ***REMOVED***bg-slate-200 text-slate-400***REMOVED*** : ***REMOVED******REMOVED***}`}
          >
            {uploading ? (
              <span className="flex flex-row gap-1">Uploading ...</span>
            ) : (
              ***REMOVED***Browse Files***REMOVED***
            )}
          </div>
        )}
        {file && (
          <span className="text-sm text-gray-700">
            <span className="bg-slate-200 p-2 my-2 inline-flex items-center gap-1 rounded-md">
              <File size={14} /> {file.name}{***REMOVED*** ***REMOVED***}
            </span>
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
                if (fileInputRef.current) {
                  fileInputRef.current.value = ***REMOVED******REMOVED***
                }
              }}
            />
          </span>
        )}
      </label>
      {fileRef && (
        <div className="flex flex-row gap-2">
          <FileDisplay fileRef={fileRef} />
          {!file && (
            <X
              className="inline-block ml-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setFile(null)
                setFileRef(null)
                onChange(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ***REMOVED******REMOVED***
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default FileUpload
