import type { IDocument, IObjectSchema, IObjectType } from ***REMOVED***@/types/types***REMOVED***

export const ImportItem = ({
  item,
  object_schema,
  object_type,
}: {
  item: IDocument<unknown>
  object_schema: IObjectSchema
  object_type: IObjectType
}): ReactElement => {}

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full">
      <div
        className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-l-full"
        style={{ width: `${progress}%` }}
      >
        {progress}%
      </div>
    </div>
  )
}
