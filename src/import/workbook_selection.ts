import type { ParsedWorkbookSheet } from './workbook'

export const selectWorkbookSheets = (
  sheets: ParsedWorkbookSheet[],
  selectedNames: ReadonlySet<string>
): ParsedWorkbookSheet[] => sheets.filter(({ name }) => selectedNames.has(name))