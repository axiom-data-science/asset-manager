import { useFormContext, useFormValues, type IFieldInputProps } from '@axdspub/axiom-ui-forms'
import { useEffect, useState, type ReactElement } from 'react'
import FileUpload from './file_upload'
import type { ParsedCSV } from '@/lib/csv'

const CSVUploadForSampleFile = ({ field, value }: IFieldInputProps): ReactElement => {
  const { setFormValues } = useFormContext()
  const formValues = useFormValues()
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [fileUri, setFileUri] = useState<string | null>(
    value !== undefined && value !== null ? String(value) : null
  )

  useEffect(() => {
    if (!!fileUri && !!csvData) {
      console.log('Updating form values with sample_file data')
      const headers = csvData.headers.map((h) => {
        return {
          cell_header: h.key,
          data_type: h.type === 'dateString' ? 'string' : h.type,
          time_format: h.pattern,
          cell_parameter: h.type === 'dateString' ? 'time' : null,
        }
      })
      const newFormValues = {
        ...formValues,
        sample_file: {
          file_uri: fileUri,
          headers,
        },
      }

      setFormValues(newFormValues)
    } else if (!fileUri && !csvData) {
      console.log('Clearing sample_file field in form values')
      setFormValues({
        ...formValues,
        sample_file: {
          file_uri: null,
          headers: null,
        },
      })
    }
    // including formValues was causing infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUri, csvData])

  return (
    <FileUpload
      field={field}
      value={value}
      onChange={(e) => {
        const newFileUri = e === null ? null : String(e)
        if (newFileUri !== fileUri) {
          setFileUri(newFileUri)
        }
        if (newFileUri === null) {
          setCsvData(null)
        }
      }}
      acceptFileTypes={['csv', 'text/csv']}
      onFileUploaded={(_fileData, fileCSVData) => {
        setCsvData(fileCSVData)
      }}
    />
  )
}

export default CSVUploadForSampleFile
