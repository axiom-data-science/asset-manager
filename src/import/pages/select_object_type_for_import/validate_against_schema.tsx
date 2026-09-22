import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from ***REMOVED***@/components/ui/dialog***REMOVED***
import type { CanonicalImportRecord } from ***REMOVED***@/import/types***REMOVED***
import { importRecordKey, useImportSession } from ***REMOVED***@/import/state/importState***REMOVED***
import { CopyButton } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import type { IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { schemaToFormUtils, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Button, Loader, Tabs, Tooltip } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { Check, X, TriangleAlert } from ***REMOVED***lucide-react***REMOVED***
import type { JSONSchema } from ***REMOVED***quicktype-core***REMOVED***
import { useMemo, useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

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
  const [validationScope, setValidationScope] = useState<***REMOVED***sample***REMOVED*** | ***REMOVED***selected***REMOVED*** | ***REMOVED***full***REMOVED***>(***REMOVED***full***REMOVED***)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
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
  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedKeys.has(importRecordKey(document))),
    [documents, selectedKeys]
  )
  const validationTargets =
    validationScope === ***REMOVED***sample***REMOVED***
      ? documents.slice(0, Math.min(10, documents.length))
      : validationScope === ***REMOVED***selected***REMOVED***
        ? selectedDocuments
        : documents

  const validateDocuments = async () => {
    if (validationTargets.length === 0) return
    setIsLoading(true)
    const cleanedSchema = omit(schema as Record<string, unknown>, ***REMOVED***$schema***REMOVED***)
    const results: {
      document: CanonicalImportRecord
      isValid: boolean
      errors?: IValidationError[]
    }[] = []
    const batchSize = 10

    for (let i = 0; i < validationTargets.length; i += batchSize) {
      const batch = validationTargets.slice(i, i + batchSize)

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
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Validation scope</span>
            <select
              className="border px-2 py-1"
              value={validationScope}
              onChange={(event) =>
                setValidationScope(event.target.value as ***REMOVED***sample***REMOVED*** | ***REMOVED***selected***REMOVED*** | ***REMOVED***full***REMOVED***)
              }
              disabled={isLoading}
            >
              <option value="sample">Sample (up to 10)</option>
              <option value="selected">Selected records</option>
              <option value="full">All records</option>
            </select>
          </label>
          <Button
            disabled={isLoading || validationTargets.length === 0}
            onClick={validateDocuments}
          >
            Validate {validationTargets.length} records
          </Button>
          <span className="text-xs text-gray-600">
            {validationResults.length} of {documents.length} records have validation results.
          </span>
        </div>
        {validationScope === ***REMOVED***selected***REMOVED*** && (
          <div className="flex max-h-32 flex-wrap gap-x-4 gap-y-2 overflow-auto border p-2 text-sm">
            {documents.map((document) => {
              const key = importRecordKey(document)
              return (
                <label key={key} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    onChange={(event) => {
                      setSelectedKeys((current) => {
                        const next = new Set(current)
                        if (event.target.checked) next.add(key)
                        else next.delete(key)
                        return next
                      })
                    }}
                    disabled={isLoading}
                  />
                  {document.label ?? document.slug}
                </label>
              )
            })}
          </div>
        )}
        {validationResults.length > 0 && (
          <div className="flex gap-3 text-sm" role="status">
            <span className="text-green-700">{validCount} valid</span>
            <span className={invalidCount > 0 ? ***REMOVED***text-red-700***REMOVED*** : ***REMOVED***text-gray-600***REMOVED***}>
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
                          id: ***REMOVED***doc***REMOVED***,
                          label: ***REMOVED***Document***REMOVED***,
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
                          id: ***REMOVED***errors***REMOVED***,
                          disabled: !result?.errors?.length,
                          label: result?.errors?.length ? (
                            <span
                              className={`flex flex-row gap-2 items-center ${result?.errors?.length ? ***REMOVED***text-red-600***REMOVED*** : ***REMOVED******REMOVED***}`}
                            >
                              <TriangleAlert className="w-3 h-3" /> Errors ({result?.errors?.length}
                              )
                            </span>
                          ) : (
                            ***REMOVED***No errors***REMOVED***
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
                  {result.document.label ?? result.document.slug}:{***REMOVED*** ***REMOVED***}
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
