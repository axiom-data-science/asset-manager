import { FieldLabel, type IFieldInputProps, type ITextField } from ***REMOVED***@axdspub/axiom-ui-forms***REMOVED***
import { Input, Loader, Tooltip, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { Cross2Icon } from ***REMOVED***@radix-ui/react-icons***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import type { ISensorStationRecord, ISensorStationSearchResponse } from ***REMOVED***./types***REMOVED***

const SelectedStationDisplay = ({ uuid }: { uuid: string }) => {
  const { data, isLoading, error } = useQuery<ISensorStationRecord>({
    queryKey: [***REMOVED***station***REMOVED***, uuid],
    queryFn: async () => {
      const response = await fetch(`https://search.axds.co/v2/docs?id=${uuid}`, {
        headers: {
          ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
          Accept: ***REMOVED***application/json***REMOVED***,
        },
      })
      if (!response.ok) {
        throw new Error(***REMOVED***Network response was not ok***REMOVED***)
      }
      return await response.json()
    },
  })
  return (
    <div className="relative flex flex-col gap-2">
      <p>{uuid}</p>
      <ViewWithLoader isLoading={isLoading} error={error} data={data}>
        {data && <p className="font-bold">{data.label}</p>}
      </ViewWithLoader>
    </div>
  )
}

const StationSearch = ({ field, onChange, value, disabled }: IFieldInputProps): ReactElement => {
  const textField = field as ITextField
  const [searchValue, setSearchValue] = useState<string | undefined>()
  const [selectedRecord, setSelectedRecord] = useState<string | undefined>(
    value as string | undefined
  )
  const extraSearchString = field.settings?.extraSearchString

  const { data, isLoading, error } = useQuery<ISensorStationSearchResponse>({
    queryKey: [searchValue],
    enabled: searchValue !== undefined && searchValue.length > 0, // Only run the query if searchValue is defined
    queryFn: async () => {
      const response = await fetch(
        `https://search.axds.co/v2/search?portalId=-1&page=1&pageSize=100&type=sensor_station&query=${encodeURIComponent(searchValue ?? ***REMOVED******REMOVED***)}${extraSearchString ? `&${extraSearchString}` : ***REMOVED******REMOVED***}`,
        {
          headers: {
            ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
            Accept: ***REMOVED***application/json***REMOVED***,
          },
        }
      )
      if (!response.ok) {
        throw new Error(***REMOVED***Network response was not ok***REMOVED***)
      }
      return await response.json()
    },
  })

  const updateRecord = (r: string | undefined) => {
    setSelectedRecord(r)
    if (r !== value) {
      onChange(r)
    }
  }

  return (
    <div className="relative">
      <FieldLabel.FieldLabel field={field} disabled={disabled} />
      {selectedRecord !== undefined && selectedRecord !== null ? (
        <div className="p-2 bg-gray-100 flex flex-row align-middle gap-4">
          <Tooltip content={***REMOVED***Clear selection***REMOVED***} contentClassName="max-w-[200px]">
            <Cross2Icon
              className="w-6 h-6 cursor-pointer flex-none opacity-40 hover:opacity-100"
              onClick={() => {
                updateRecord(undefined)
              }}
            />
          </Tooltip>
          <div>{selectedRecord && <SelectedStationDisplay uuid={selectedRecord} />}</div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Input
              id={field.id}
              testId={field.id}
              value={searchValue}
              placeholder={textField.placeholder ?? ***REMOVED***Enter search term***REMOVED***}
              label={null}
              onChange={(e) => {
                setSearchValue(e)
              }}
              disabled={!!disabled}
            />
            {!disabled && (
              <Cross2Icon
                className="absolute right-2 bottom-3 w-6 h-6 cursor-pointer opacity-40 hover:opacity-100"
                onClick={() => {
                  setSearchValue(undefined)
                  updateRecord(undefined)
                }}
              />
            )}
          </div>
          {(isLoading || data !== undefined) && !disabled && (
            <div className="absolute left-0 right-0 top-full z-40 bg-white border border-gray-300 shadow-lg h-60 overflow-y-auto">
              {isLoading && <Loader className="absolute top-10" />}
              {error !== null && <p className="p-4 text-red-600">Error: {error.message}</p>}
              {data?.results.map((station) => (
                <div
                  key={station.uuid}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    updateRecord(station.uuid)
                  }}
                >
                  <div className="font-semibold">{station.label}</div>
                  <div className="text-sm text-gray-600">{station.uuid}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StationSearch
