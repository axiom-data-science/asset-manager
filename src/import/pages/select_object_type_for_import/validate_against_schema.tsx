import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from ***REMOVED***@/components/ui/dialog***REMOVED***
import type { IDocumentImport } from ***REMOVED***@/import/types***REMOVED***
import { CopyButton } from ***REMOVED***@/manage/components/copy_field***REMOVED***
import type { IValidationError } from ***REMOVED***@/types/types***REMOVED***
import { schemaToFormUtils, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Button, Loader, Tabs, Tooltip } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { Check, X, TriangleAlert } from ***REMOVED***lucide-react***REMOVED***
import type { JSONSchema } from ***REMOVED***quicktype-core***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

const ValidateAgainstSchema = ({
  schema,
  documents,
}: {
  schema: JSONSchema
  documents: IDocumentImport[]
}): ReactElement => {
  const [validationResults, setValidationResults] = useState<
    { document: IDocumentImport; isValid: boolean; errors?: IValidationError[] }[]
  >([])

  const [isLoading, setIsLoading] = useState(false)

  const validateDocuments = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const results = await Promise.all(
      documents.map(async (doc) => {
        const againstSchema = schemaToFormUtils.validateAgainstSchema(
          omit(schema as Record<string, unknown>, ***REMOVED***$schema***REMOVED***),
          doc.data as IFormValues
        )

        return {
          document: doc,
          isValid: !againstSchema?.length,
          errors: againstSchema?.length ? againstSchema : undefined,
        }
      })
    )

    setValidationResults(results)
    setIsLoading(false)
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full relative">
        <Button onClick={validateDocuments}>Validate {documents.length} Documents</Button>
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
                    <Button size="xs" className="text-white">
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
