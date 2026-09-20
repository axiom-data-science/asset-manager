import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { CanonicalImportRecord } from '@/import/types'
import { importRecordKey, useImportSession } from '@/import/state/importState'
import { CopyButton } from '@/manage/components/copy_field'
import type { IValidationError } from '@/types/types'
import { schemaToFormUtils, type IFormValues } from '@axdspub/axiom-ui-forms'
import { Button, Loader, Tabs, Tooltip } from '@axdspub/axiom-ui-utilities'
import { Check, X, TriangleAlert } from 'lucide-react'
import type { JSONSchema } from 'quicktype-core'
import { useState, type ReactElement } from 'react'
import { omit } from 'lodash-es'

const ValidateAgainstSchema = ({
  schema,
  documents,
  sourceId,
}: {
  schema: JSONSchema
  documents: CanonicalImportRecord[]
  sourceId: string
}): ReactElement => {
  const { session, setValidationResults } = useImportSession(sourceId)
  const [isLoading, setIsLoading] = useState(false)
  const validationResults = documents
    .map((document) => ({
      document,
      result: session.validationResults[importRecordKey(document)],
    }))
    .filter(({ result }) => result !== undefined)
    .map(({ document, result }) => ({
      document,
      isValid: result.isValid,
      errors: result.errors.map((message) => ({ message }) as IValidationError),
    }))
  const validCount = validationResults.filter((result) => result.isValid).length
  const invalidCount = validationResults.length - validCount

  const validateDocuments = async () => {
    setIsLoading(true)
    const cleanedSchema = omit(schema as Record<string, unknown>, '$schema')
    const results: { document: CanonicalImportRecord; isValid: boolean; errors?: IValidationError[] }[] = []
    const batchSize = 10

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)

      for (const doc of batch) {
        const againstSchema = schemaToFormUtils.validateAgainstSchema(
          cleanedSchema,
          doc.data as IFormValues
        )

        results.push({
          document: doc,
          isValid: !againstSchema?.length,
          errors: againstSchema?.length ? againstSchema : undefined,
        })
      }

      // Yield between batches so the browser can paint and handle input.
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    setValidationResults(
      results.map((result) => ({
        record: result.document,
        result: {
          isValid: result.isValid,
          errors: result.errors?.map((validationError) => validationError.message) ?? [],
        },
      }))
    )
    setIsLoading(false)
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full relative">
        <Button onClick={validateDocuments}>Validate {documents.length} Documents</Button>
        {validationResults.length > 0 && (
          <div className="flex gap-3 text-sm" role="status">
            <span className="text-green-700">{validCount} valid</span>
            <span className={invalidCount > 0 ? 'text-red-700' : 'text-gray-600'}>
              {invalidCount} invalid
            </span>
          </div>
        )}
        {isLoading && <Loader className="top-30" />}
        {!isLoading && (
          <ul className="flex flex-col gap-2 h-full overflow-auto">
            {validationResults.map((result, index) => (
              <li key={index} className="flex flex-row gap-2 items-center">
                {result.isValid ? (
                  <Check className="text-green-600 flex-none" />
                ) : (
                  <X className="text-red-600 flex-none" />
                )}
                <Dialog modal={true}>
                  <DialogTrigger asChild>
                    <Button size="xs" variant="default">
                      Show document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100vw-2rem)] max-w-350 sm:max-w-350 lg:max-w-[calc(100vw-100px)] flex flex-col gap-4 h-[calc(100vh-150px)]">
                    <DialogHeader className="flex flex-col gap-2 border-b pb-2">
                      <DialogTitle className="flex flex-row gap-2 items-center">
                        {result.document.label ?? result.document.slug}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs
                      tabs={[
                        {
                          id: 'doc',
                          label: 'Document',
                          content: (
                            <div className="relative">
                              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-[calc(100vh-300px)]">
                                {JSON.stringify(result.document.data, null, 2)}
                              </pre>
                              <span className="absolute top-14 right-14">
                                <CopyButton
                                  size={40}
                                  value={JSON.stringify(result.document.data, null, 2)}
                                />
                              </span>
                            </div>
                          ),
                        },
                        {
                          id: 'errors',
                          disabled: !result?.errors?.length,
                          label: result?.errors?.length ? (
                            <span
                              className={`flex flex-row gap-2 items-center ${result?.errors?.length ? 'text-red-600' : ''}`}
                            >
                              <TriangleAlert className="w-3 h-3" /> Errors ({result?.errors?.length}
                              )
                            </span>
                          ) : (
                            'No errors'
                          ),
                          content: (
                            <div className="flex flex-col gap-2 w-100">
                              {result?.errors?.map((e) => (
                                <p key={e.message}>{e.message}</p>
                              ))}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </DialogContent>
                </Dialog>
                <span className="text-xs overflow-hidden">
                  {result.document.label ?? result.document.slug}:{' '}
                </span>
                {result.isValid ? (
                  <span className="bg-green-200 p-1 rounded-sm text-xs">Valid</span>
                ) : (
                  <Tooltip
                    content={
                      <div className="flex flex-col gap-2 text-xs w-100">
                        {result?.errors?.map((e) => (
                          <p key={e.message}>{e.message}</p>
                        ))}
                      </div>
                    }
                    dark={true}
                  >
                    <span className="bg-red-600 p-1 text-white text-xs flex flex-row gap-1 rounded-sm shadow-sm items-center whitespace-nowrap">
                      <TriangleAlert className="w-3 h-3" /> {result?.errors?.length} errors
                    </span>
                  </Tooltip>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default ValidateAgainstSchema
