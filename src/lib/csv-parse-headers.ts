/** First non-empty line, delimiter-aware (comma/tab), quoted cells. */

export function parseFirstRowCells(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQ = !inQ
    } else if ((c === ',' || c === '\t') && !inQ) {
      cells.push(cur.trim().replace(/^"|"$/g, ''))
      cur = ''
    } else {
      cur += c
    }
  }
  cells.push(cur.trim().replace(/^"|"$/g, ''))
  return cells
}

export function extractCsvHeaders(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const first = lines[0] ?? ''
  return parseFirstRowCells(first).filter((h) => h.length > 0)
}

export function previewCsvRows(csvText: string, maxRows: number): string[][] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const grid = lines.slice(0, maxRows + 1).map((line) => parseFirstRowCells(line))
  return grid
}
