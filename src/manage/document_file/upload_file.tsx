import { uploadFileToPostgrest } from '@/services/postgrest/services'
import { useCallback, useState, type ReactElement } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { useAuth } from 'react-oidc-context'
import Link from '../components/link'
import { Button } from '@axdspub/axiom-ui-utilities'
import { APPS_API_BASE_URL } from '@/config/config'

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
      form.append('file', new Blob([byteArray], { type: f.type }), f.name)

      /* postToPostgrest({
                        table: 'rpc/upload_document_file',
                        body: byteArray,//file,
                        token: auth.user?.access_token || '',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `filename="${f.name}"`
                        }
                    }) */
      uploadFileToPostgrest({
        file: f,
        token: auth.user?.access_token || '',
      })
        .then((response) => {
          console.log('File uploaded successfully:', response)
          setUploadUUID(String(response))
        })
        .catch((error) => {
          console.error('Error uploading file:', error)
          setUploadUUID(null)
        })
    }
    reader.readAsArrayBuffer(f)

    /* const arrayBuffer = await file.arrayBuffer();
            postToPostgrest<ArrayBuffer, string>({
                    table: 'rpc/upload_document_file',
                    body: arrayBuffer,
                    token: auth.user?.access_token || '',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `filename="${file.name}"`

                    }
                }).then(response => {
                    console.log('File uploaded successfully:', response);
                    setUploadUUID(response)
                }).catch(error => {
                    console.error('Error uploading file:', error);
                    setUploadUUID(null)
                }); */
  }

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Logic for accepted files
      setFile(acceptedFiles[0] || null)
      acceptedFiles.forEach((file) => {
        console.log('Accepted file:', file)
        //setFile(file)
        /*const formData = new FormData();
                formData.append('bytea', file);
                postToPostgrest({
                    table: 'rpc/upload_document_file',
                    body: formData,
                    token: auth.user?.access_token || '',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `filename="${file.name}"`

                    }
                }).then(response => {
                    console.log('File uploaded successfully:', response);
                    setUploadUUID(String(response))
                }).catch(error => {
                    console.error('Error uploading file:', error);
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
      'image/jpeg': [],
      'image/png': [],
      'text/csv': [],
    },
    maxFiles: 5,
    maxSize: 5242880, // 5MB
  })

  return (
    <>
      <div>
        {uploadUUID ? (
          <p>
            File uploaded with UUID:{' '}
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
          border: '2px dashed #cccccc',
          padding: '20px',
          backgroundColor: isDragActive ? '#eeeeee' : '#fafafa',
          cursor: 'pointer',
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
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
