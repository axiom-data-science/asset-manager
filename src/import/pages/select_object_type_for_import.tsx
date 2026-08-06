import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import type { IDocumentImport } from ***REMOVED***../types***REMOVED***
import { Inputs, schemaToFormUtils, type IFormValues } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { omit } from ***REMOVED***lodash-es***REMOVED***

import {
  type LanguageName,
  quicktype,
  jsonInputForTargetLanguage,
  InputData,
  type JSONSchema,
} from ***REMOVED***quicktype-core***REMOVED***
import { Loader, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState } from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from ***REMOVED***@/components/ui/dialog***REMOVED***
import { CopyButton } from ***REMOVED***@/manage/components/copy_field***REMOVED***

async function quicktypeJSON(
  targetLanguage: LanguageName,
  typeName: string,
  jsonString: string | string[]
) {
  const jsonInput = jsonInputForTargetLanguage(***REMOVED***json-schema***REMOVED***, undefined, true, {
    ***REMOVED***no-enums***REMOVED***: true,
    ***REMOVED***all-properties-optional***REMOVED***: true,
  })

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we***REMOVED***re
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: typeName,
    samples: Array.isArray(jsonString) ? jsonString : [jsonString],
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
  })
}

const ValidateAgainstSchema = ({
  schema,
  documents,
}: {
  schema: JSONSchema
  documents: IDocumentImport[]
}) => {
  const [validationResults, setValidationResults] = useState<
    { document: IDocumentImport; isValid: boolean; errors?: string[] }[]
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
        <Button onClick={validateDocuments}>Validate Documents</Button>
        {isLoading && <Loader className="top-30" />}
        <ul className="flex flex-col gap-2 h-full overflow-auto">
          {validationResults.map((result, index) => (
            <li key={index} className="flex flex-row gap-2 items-center">
              <Dialog modal={true}>
                <DialogTrigger asChild>
                  <Button size="xs" className="text-white">
                    Show document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-100px)] mr-2 flex flex-col gap-4">
                  <DialogHeader className="flex flex-col gap-2 border-b pb-2">
                    <DialogTitle className="flex flex-row gap-2 items-center">
                      {result.document.label ?? result.document.slug}
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                  </DialogHeader>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-[calc(100vh-200px)]">
                    {JSON.stringify(result.document.data, null, 2)}
                  </pre>
                  <span className="absolute top-14 right-14">
                    <CopyButton size={40} value={JSON.stringify(result.document.data, null, 2)} />
                  </span>
                </DialogContent>
              </Dialog>
              <span className="text-xs">
                {result.document.label ?? result.document.slug}:{***REMOVED*** ***REMOVED***}
                {result.isValid ? ***REMOVED***Valid***REMOVED*** : `Invalid - Errors: ${result.errors?.join(***REMOVED***, ***REMOVED***)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

const SelectObjectTypeForImport = ({ documents }: { documents: IDocumentImport[] }) => {
  const [schema, setSchema] = useState<JSONSchema | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: [***REMOVED***eval-object-types***REMOVED***, documents],
    queryFn: async () => {
      const ob = await quicktypeJSON(
        ***REMOVED***json-schema***REMOVED***,
        ***REMOVED***test***REMOVED***,
        documents.map((d) => JSON.stringify(d.data))
      )
      const schema = JSON.parse(ob.lines.join(***REMOVED***\n***REMOVED***))
      setSchema(schema)
      return schema
    },
  })
  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <div className="flex flex-row gap-4 h-full">
          <div className="flex flex-col gap-2 w-1/2 h-full">
            <Inputs.JSONInput
              value={schema}
              field={{
                id: ***REMOVED***objectTypeSchema***REMOVED***,
                label: ***REMOVED***Object type schema***REMOVED***,
                description:
                  ***REMOVED***The schema for the object type to be imported. This is generated from the imported data, but can be modified if needed.***REMOVED***,
                type: ***REMOVED***json***REMOVED***,
              }}
              onChange={(value) => {
                setSchema(value as JSONSchema)
              }}
            />
          </div>
          <div className="flex flex-col gap-2 w-1/2 h-full">
            {schema && <ValidateAgainstSchema schema={schema} documents={documents} />}
          </div>
        </div>
      )}
    </ViewWithLoader>
  )
}

export default SelectObjectTypeForImport
