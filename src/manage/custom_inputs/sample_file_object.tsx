import {
  FieldLabel,
  Inputs,
  type IFieldInputProps,
  type IObjectField,
  type IValueType,
} from '@axdspub/axiom-ui-forms'
import { useState, type ReactElement } from 'react'
import FileUpload from './file_upload'
import type { ParsedCSV } from '@/lib/csv'

const SampleFileObject = ({ field, value, onChange }: IFieldInputProps): ReactElement => {
  const objectField = field as IObjectField
  const objectValue = value as Record<string, unknown> | null
  const inputField = objectField.fields?.find((f) => f.id === 'file_uri') ?? undefined
  const inputValue = objectValue?.file_uri ? String(objectValue.file_uri) : undefined

  const headersField = objectField.fields?.find((f) => f.id === 'headers') as
    | IObjectField
    | undefined
  const headersValue: IValueType | undefined = objectValue?.headers
    ? (objectValue.headers as IValueType)
    : undefined
  const inputOnChange = (newValue: IValueType | IValueType[] | null): void => {
    onChange({
      ...objectValue,
      file_uri: newValue,
    })
  }
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel.FieldLabel field={field} />
      {inputField && (
        <FileUpload
          field={inputField}
          value={inputValue}
          onChange={inputOnChange}
          acceptFileTypes={['csv', 'text/csv']}
          onFileUploaded={(_fileData, fileCSVData) => {
            setCsvData(fileCSVData)
          }}
        />
      )}
      {inputValue && headersField && (
        <Inputs.ObjectInput
          field={headersField}
          value={
            (headersValue ??
              csvData?.headers.map((h) => {
                return {
                  cell_header: h.key,
                  data_type: h.type,
                  time_format: h.pattern,
                }
              }) ??
              undefined) as IValueType | undefined
          }
          onChange={(newHeadersValue) => {
            onChange({
              ...objectValue,
              headers: newHeadersValue,
            })
          }}
        />
      )}
    </div>
  )
}

export default SampleFileObject
