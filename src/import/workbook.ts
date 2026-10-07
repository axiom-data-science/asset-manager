import readXlsxFile, { type Sheet, type SheetData } from 'read-excel-file/universal'
import { parseCSV, type ParsedCSV } from '@/lib/csv'

export type ParsedWorkbookSheet = {
    name: string
    text: string
    parsed: ParsedCSV
}

const serializeCell = (value: SheetData[number][number]): string => {
    const text = value instanceof Date ? value.toISOString() : String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const worksheetToCSV = (rows: SheetData): string =>
    rows
        .filter((row) => row.some((value) => value !== null && value !== ''))
        .map((row) => row.map(serializeCell).join(','))
        .join('\n')

export const convertWorkbookSheets = (sheets: Sheet[]): ParsedWorkbookSheet[] =>
    sheets.flatMap(({ sheet: name, data }) => {
        const text = worksheetToCSV(data)
        const parsed = parseCSV(text)
        return parsed.headers.length > 0 ? [{ name, text, parsed }] : []
    })

export const parseWorkbook = async (data: ArrayBuffer): Promise<ParsedWorkbookSheet[]> =>
    convertWorkbookSheets(await readXlsxFile(data))

export const parseWorkbookFile = async (file: File): Promise<ParsedWorkbookSheet[]> =>
    parseWorkbook(await file.arrayBuffer())
