export type CSVColumnType = ***REMOVED***string***REMOVED*** | ***REMOVED***float***REMOVED*** | ***REMOVED***dateString***REMOVED***

export type CSVHeader = {
  key: string
  type: CSVColumnType
  pattern?: string
}

export type ParsedCSV = {
  headers: CSVHeader[]
  data: Record<string, string | number>[]
}

const CSV_NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/
const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const YMD_HMS_SPACE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/
const YMD_HMS_T_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|[+-]\d{2}:?\d{2})?$/

const isNumericValue = (value: string): boolean => CSV_NUMBER_PATTERN.test(value)

const isValidUtcDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): boolean => {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (hour < 0 || hour > 23) return false
  if (minute < 0 || minute > 59) return false
  if (second < 0 || second > 59) return false

  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day &&
    utc.getUTCHours() === hour &&
    utc.getUTCMinutes() === minute &&
    utc.getUTCSeconds() === second
  )
}

const getKnownDatePattern = (value: string): string | null => {
  const ymd = value.match(YMD_PATTERN)
  if (ymd) {
    const year = Number(ymd[1])
    const month = Number(ymd[2])
    const day = Number(ymd[3])
    return isValidUtcDate(year, month, day) ? ***REMOVED***YYYY-MM-dd***REMOVED*** : null
  }

  const ymdHmsSpace = value.match(YMD_HMS_SPACE_PATTERN)
  if (ymdHmsSpace) {
    const year = Number(ymdHmsSpace[1])
    const month = Number(ymdHmsSpace[2])
    const day = Number(ymdHmsSpace[3])
    const hour = Number(ymdHmsSpace[4])
    const minute = Number(ymdHmsSpace[5])
    const second = Number(ymdHmsSpace[6])
    return isValidUtcDate(year, month, day, hour, minute, second) ? ***REMOVED***YYYY-MM-dd HH:mm:ss.s***REMOVED*** : null
  }

  const ymdHmsT = value.match(YMD_HMS_T_PATTERN)
  if (ymdHmsT) {
    const year = Number(ymdHmsT[1])
    const month = Number(ymdHmsT[2])
    const day = Number(ymdHmsT[3])
    const hour = Number(ymdHmsT[4])
    const minute = Number(ymdHmsT[5])
    const second = Number(ymdHmsT[6])
    return isValidUtcDate(year, month, day, hour, minute, second) ? ***REMOVED***YYYY-MM-ddTHH:mm:ss.s***REMOVED*** : null
  }

  return null
}

const inferDatePattern = (values: string[]): string | undefined => {
  const knownPatterns = values.map((value) => getKnownDatePattern(value))

  if (knownPatterns.every((pattern) => pattern !== null)) {
    const uniquePatterns = Array.from(new Set(knownPatterns))
    if (uniquePatterns.length === 1) {
      return uniquePatterns[0] as string
    }
  }

  return undefined
}

const isDateLikeValue = (value: string): boolean => {
  if (getKnownDatePattern(value) !== null) return true

  // Require a date-like delimiter to avoid treating plain words as dates.
  if (!/[-/:T]/.test(value)) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed)
}

const parseCSVRows = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ***REMOVED******REMOVED***
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ***REMOVED******REMOVED***
  }

  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === ***REMOVED***"***REMOVED***) {
      if (inQuotes) {
        if (nextChar === ***REMOVED***"***REMOVED***) {
          field += ***REMOVED***"***REMOVED***
          i += 1
        } else {
          inQuotes = false
        }
      } else if (field.length === 0) {
        inQuotes = true
      } else {
        field += char
      }
      continue
    }

    if (char === ***REMOVED***,***REMOVED*** && !inQuotes) {
      pushField()
      continue
    }

    if ((char === ***REMOVED***\n***REMOVED*** || char === ***REMOVED***\r***REMOVED***) && !inQuotes) {
      if (char === ***REMOVED***\r***REMOVED*** && nextChar === ***REMOVED***\n***REMOVED***) {
        i += 1
      }
      pushRow()
      continue
    }

    field += char
  }

  if (field.length > 0 || row.length > 0) {
    pushRow()
  }

  return rows.filter((candidateRow) => candidateRow.some((cell) => cell.trim() !== ***REMOVED******REMOVED***))
}

const toUniqueHeaders = (headerRow: string[]): string[] => {
  const used = new Map<string, number>()

  return headerRow.map((rawHeader, index) => {
    const base = rawHeader.trim() || `column_${index + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}_${seen + 1}`
  })
}

export const parseCSV = (text: string): ParsedCSV => {
  if (typeof text !== ***REMOVED***string***REMOVED***) {
    throw new Error(***REMOVED***Expected text to be a string***REMOVED***)
  }

  const rows = parseCSVRows(text)
  if (rows.length === 0) {
    return { headers: [], data: [] }
  }

  const headerKeys = toUniqueHeaders(rows[0])
  const valueRows = rows.slice(1)
  const maxSampleSize = 50

  const headers = headerKeys.map((key, columnIndex) => {
    const sampleValues = valueRows
      .slice(0, maxSampleSize)
      .map((row) => (row[columnIndex] ?? ***REMOVED******REMOVED***).trim())
      .filter((value) => value !== ***REMOVED******REMOVED***)

    let type: CSVColumnType = ***REMOVED***string***REMOVED***
    let pattern: string | undefined

    if (sampleValues.length > 0 && sampleValues.every((value) => isNumericValue(value))) {
      type = ***REMOVED***float***REMOVED***
    } else if (sampleValues.length > 0 && sampleValues.every((value) => isDateLikeValue(value))) {
      type = ***REMOVED***dateString***REMOVED***
      pattern = inferDatePattern(sampleValues)
    }

    return { key, type, pattern }
  })

  const data = valueRows.map((row) => {
    const record: Record<string, string | number> = {}

    headers.forEach((header, index) => {
      const rawValue = (row[index] ?? ***REMOVED******REMOVED***).trim()
      if (header.type === ***REMOVED***float***REMOVED*** && rawValue !== ***REMOVED******REMOVED*** && isNumericValue(rawValue)) {
        record[header.key] = Number(rawValue)
      } else {
        record[header.key] = rawValue
      }
    })

    return record
  })

  return { headers, data }
}
