const CSV_LIKE = /\.(csv|tsv|txt)$/i
const MAX_BYTES = 2 * 1024 * 1024

export interface CsvFileValidationResult {
  ok: boolean
  error?: string
}

export function validateCsvFile(file: File): CsvFileValidationResult {
  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'No file selected.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'File is too large (max 2 MB).' }
  }
  if (!CSV_LIKE.test(file.name)) {
    return { ok: false, error: 'Use a .csv, .tsv, or .txt file.' }
  }
  return { ok: true }
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}
