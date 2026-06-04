import { useFormContext, useFormValues, type IFieldInputProps } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { useEffect, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import FileUpload from ***REMOVED***./file_upload***REMOVED***
import type { ParsedCSV } from ***REMOVED***@/lib/csv***REMOVED***

const CSVUploadForSampleFile = ({ field, value }: IFieldInputProps): ReactElement => {
  const { setFormValues } = useFormContext()
  const formValues = useFormValues()
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [fileUri, setFileUri] = useState<string | null>(
    value !== undefined && value !== null ? String(value) : null
  )

  useEffect(() => {
    if (!!fileUri && !!csvData) {
      console.log(***REMOVED***Updating form values with sample_file data***REMOVED***)
      const headers = csvData.headers.map((h) => {
        return {
          cell_header: h.key,
          data_type: h.type === ***REMOVED***dateString***REMOVED*** ? ***REMOVED***string***REMOVED*** : h.type,
          time_format: h.pattern,
          cell_parameter: h.type === ***REMOVED***dateString***REMOVED*** ? ***REMOVED***time***REMOVED*** : null,
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
      console.log(***REMOVED***Clearing sample_file field in form values***REMOVED***)
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
      acceptFileTypes={[***REMOVED***csv***REMOVED***, ***REMOVED***text/csv***REMOVED***]}
      onFileUploaded={(_fileData, fileCSVData) => {
        setCsvData(fileCSVData)
      }}
    />
  )
}

export default CSVUploadForSampleFile
