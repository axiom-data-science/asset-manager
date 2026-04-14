import { uploadFileToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***
import { useCallback, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { useDropzone, type FileRejection } from ***REMOVED***react-dropzone***REMOVED***
import { useAuth } from ***REMOVED***react-oidc-context***REMOVED***
import Link from ***REMOVED***../components/link***REMOVED***
import { Button } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { APPS_API_BASE_URL } from ***REMOVED***@/config/config***REMOVED***

const UploadFile = (): ReactElement => {
  const [files, setFiles] = useState<File[]>([])
  const auth = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [uploadUUID, setUploadUUID] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files ? e.target.files[0] : null)
  }

  const uploadFile = async (f?: File | null) => {
    if (!f) return

    const reader = new FileReader()
    reader.onload = () => {
      // Convert ArrayBuffer to Uint8Array
      const byteArray = new Uint8Array(reader.result as ArrayBuffer)
      console.log(`Byte array for ${f.name}:`, byteArray)
      // Here you can handle the byte array, e.g., upload it to the server
      const form = new FormData()
      form.append(***REMOVED***file***REMOVED***, new Blob([byteArray], { type: f.type }), f.name)

      /* postToPostgrest({
                        table: ***REMOVED***rpc/upload_document_file***REMOVED***,
                        body: byteArray,//file,
                        token: auth.user?.access_token || ***REMOVED******REMOVED***,
                        headers: {
                            ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/octet-stream***REMOVED***,
                            ***REMOVED***Content-Disposition***REMOVED***: `filename="${f.name}"`
                        }
                    }) */
      uploadFileToPostgrest({
        file: f,
        token: auth.user?.access_token || ***REMOVED******REMOVED***,
      })
        .then((response) => {
          console.log(***REMOVED***File uploaded successfully:***REMOVED***, response)
          setUploadUUID(String(response))
        })
        .catch((error) => {
          console.error(***REMOVED***Error uploading file:***REMOVED***, error)
          setUploadUUID(null)
        })
    }
    reader.readAsArrayBuffer(f)

    /* const arrayBuffer = await file.arrayBuffer();
            postToPostgrest<ArrayBuffer, string>({
                    table: ***REMOVED***rpc/upload_document_file***REMOVED***,
                    body: arrayBuffer,
                    token: auth.user?.access_token || ***REMOVED******REMOVED***,
                    headers: {
                        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/octet-stream***REMOVED***,
                        ***REMOVED***Content-Disposition***REMOVED***: `filename="${file.name}"`

                    }
                }).then(response => {
                    console.log(***REMOVED***File uploaded successfully:***REMOVED***, response);
                    setUploadUUID(response)
                }).catch(error => {
                    console.error(***REMOVED***Error uploading file:***REMOVED***, error);
                    setUploadUUID(null)
                }); */
  }

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Logic for accepted files
      setFile(acceptedFiles[0] || null)
      acceptedFiles.forEach((file) => {
        console.log(***REMOVED***Accepted file:***REMOVED***, file)
        //setFile(file)
        /*const formData = new FormData();
                formData.append(***REMOVED***bytea***REMOVED***, file);
                postToPostgrest({
                    table: ***REMOVED***rpc/upload_document_file***REMOVED***,
                    body: formData,
                    token: auth.user?.access_token || ***REMOVED******REMOVED***,
                    headers: {
                        ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/octet-stream***REMOVED***,
                        ***REMOVED***Content-Disposition***REMOVED***: `filename="${file.name}"`

                    }
                }).then(response => {
                    console.log(***REMOVED***File uploaded successfully:***REMOVED***, response);
                    setUploadUUID(String(response))
                }).catch(error => {
                    console.error(***REMOVED***Error uploading file:***REMOVED***, error);
                });
                const reader = new FileReader();
                reader.onload = () => {
                    // Convert ArrayBuffer to Uint8Array
                    const byteArray = new Uint8Array(reader.result as ArrayBuffer);
                    console.log(`Byte array for ${file.name}:`, byteArray);
                    // Here you can handle the byte array, e.g., upload it to the server
                    
                };
                reader.readAsArrayBuffer(file); */ //
      })
      setFiles((prev) => [...prev, ...acceptedFiles])

      // Handle rejected files (e.g., wrong format or too large)
      fileRejections.forEach(({ file, errors }) => {
        console.error(`${file.name} rejected:`, errors)
      })
    },
    [auth]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      ***REMOVED***image/jpeg***REMOVED***: [],
      ***REMOVED***image/png***REMOVED***: [],
      ***REMOVED***text/csv***REMOVED***: [],
    },
    maxFiles: 5,
    maxSize: 5242880, // 5MB
  })

  return (
    <>
      <div>
        {uploadUUID ? (
          <p>
            File uploaded with UUID:{***REMOVED*** ***REMOVED***}
            <Link
              to={`${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${uploadUUID}`}
              target="_blank"
            >
              {uploadUUID}
            </Link>
          </p>
        ) : (
          <p>No file uploaded yet.</p>
        )}
      </div>
      <div
        {...getRootProps()}
        style={{
          border: ***REMOVED***2px dashed #cccccc***REMOVED***,
          padding: ***REMOVED***20px***REMOVED***,
          backgroundColor: isDragActive ? ***REMOVED***#eeeeee***REMOVED*** : ***REMOVED***#fafafa***REMOVED***,
          cursor: ***REMOVED***pointer***REMOVED***,
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <p>Drag ***REMOVED***n***REMOVED*** drop some files here, or click to select files</p>
        )}

        {/* Optional: List of selected files */}
        <ul>
          {files.map((file) => (
            <li key={file.name}>{file.name}</li>
          ))}
        </ul>
      </div>
      <div>
        <input
          type="file"
          onChange={handleFileChange}
          className="bg-slate-200 cursor-pointer m-2 p-4"
        />
        {file && (
          <>
            <p>Selected file: {file.name}</p>
            <Button
              onClick={() => {
                uploadFile(file)
              }}
            >
              Upload Binary
            </Button>
          </>
        )}
      </div>
    </>
  )
}

export default UploadFile
