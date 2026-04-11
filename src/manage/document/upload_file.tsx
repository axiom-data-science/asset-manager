import { postToPostgrest } from ***REMOVED***@/services/postgrest/services***REMOVED***;
import React, { useCallback, useState, type ReactElement } from ***REMOVED***react***REMOVED***;
import { useDropzone, type FileRejection, type DropEvent } from ***REMOVED***react-dropzone***REMOVED***;
import { useAuth } from ***REMOVED***react-oidc-context***REMOVED***;

const UploadFile = (): ReactElement => {

    const [files, setFiles] = useState<File[]>([]);
    const auth = useAuth()

    const onDrop = useCallback(
        (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
            // Logic for accepted files

            acceptedFiles.forEach((file) => {
                console.log(***REMOVED***Accepted file:***REMOVED***, file);
                const reader = new FileReader();
                reader.onload = () => {
                    // Convert ArrayBuffer to Uint8Array
                    const byteArray = new Uint8Array(reader.result as ArrayBuffer);
                    console.log(`Byte array for ${file.name}:`, byteArray);
                    // Here you can handle the byte array, e.g., upload it to the server
                    postToPostgrest({
                        table: ***REMOVED***rpc/upload_document_file***REMOVED***,
                        body: file,
                        token: auth.user?.access_token || ***REMOVED******REMOVED***,
                        headers: {
                            ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/octet-stream***REMOVED***,
                            ***REMOVED***Content-Disposition***REMOVED***: `attachment; filename="${file.name}"`

                        }
                    }).then(response => {
                        console.log(***REMOVED***File uploaded successfully:***REMOVED***, response);
                    }).catch(error => {
                        console.error(***REMOVED***Error uploading file:***REMOVED***, error);
                    });
                };
                reader.readAsArrayBuffer(file); //

            });
            setFiles((prev) => [...prev, ...acceptedFiles]);

            // Handle rejected files (e.g., wrong format or too large)
            fileRejections.forEach(({ file, errors }) => {
                console.error(`${file.name} rejected:`, errors);
            });
        },
        []
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            ***REMOVED***image/jpeg***REMOVED***: [],
            ***REMOVED***image/png***REMOVED***: [],
            ***REMOVED***text/csv***REMOVED***: []
        },
        maxFiles: 5,
        maxSize: 5242880 // 5MB
    });

    return (
        <div
            {...getRootProps()}
            style={{
                border: ***REMOVED***2px dashed #cccccc***REMOVED***,
                padding: ***REMOVED***20px***REMOVED***,
                backgroundColor: isDragActive ? ***REMOVED***#eeeeee***REMOVED*** : ***REMOVED***#fafafa***REMOVED***,
                cursor: ***REMOVED***pointer***REMOVED***
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
    );

}

export default UploadFile;