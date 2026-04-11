import { postToPostgrest } from '@/services/postgrest/services';
import React, { useCallback, useState, type ReactElement } from 'react';
import { useDropzone, type FileRejection, type DropEvent } from 'react-dropzone';
import { useAuth } from 'react-oidc-context';

const UploadFile = (): ReactElement => {

    const [files, setFiles] = useState<File[]>([]);
    const auth = useAuth()

    const onDrop = useCallback(
        (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
            // Logic for accepted files

            acceptedFiles.forEach((file) => {
                console.log('Accepted file:', file);
                const reader = new FileReader();
                reader.onload = () => {
                    // Convert ArrayBuffer to Uint8Array
                    const byteArray = new Uint8Array(reader.result as ArrayBuffer);
                    console.log(`Byte array for ${file.name}:`, byteArray);
                    // Here you can handle the byte array, e.g., upload it to the server
                    postToPostgrest({
                        table: 'rpc/upload_document_file',
                        body: file,
                        token: auth.user?.access_token || '',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${file.name}"`

                        }
                    }).then(response => {
                        console.log('File uploaded successfully:', response);
                    }).catch(error => {
                        console.error('Error uploading file:', error);
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
            'image/jpeg': [],
            'image/png': [],
            'text/csv': []
        },
        maxFiles: 5,
        maxSize: 5242880 // 5MB
    });

    return (
        <div
            {...getRootProps()}
            style={{
                border: '2px dashed #cccccc',
                padding: '20px',
                backgroundColor: isDragActive ? '#eeeeee' : '#fafafa',
                cursor: 'pointer'
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
    );

}

export default UploadFile;