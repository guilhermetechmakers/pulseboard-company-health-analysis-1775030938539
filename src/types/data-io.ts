export type DataIoTargetModel = 'financials' | 'market' | 'social'

export type DataExportPreset = 'full_backup' | 'selective' | 'compliance'

export interface PulseDataIoImportResponse {
  accepted?: boolean
  importJobId?: string
  status?: string
  rowsProcessed?: number
  error?: string
  validationErrors?: string[]
}

export interface PulseDataIoImportStatusResponse {
  status: string
  progress: number
  rowsProcessed: number
  errors: string[]
  errorMessage: string | null
  targetModel: string | null
  fileName: string
  updatedAt: string
}

export interface PulseDataIoExportResponse {
  accepted?: boolean
  exportJobId?: string
  status?: string
  downloadHint?: string
  error?: string
}

export interface PulseDataIoExportStatusResponse {
  status: string
  progress: number
  size: number | null
  generatedAt: string | null
  errorMessage: string | null
  format: string
  scope: Record<string, unknown>
}

export interface PulseDataIoExportDownloadResponse {
  fileName: string
  mimeType: string
  content: string
}

/** Subset keys passed to export_csv `fields` for selective preset (matches pulse-data-io allow()). */
export const DATA_EXPORT_SELECTIVE_GROUPS: { value: string; label: string }[] = [
  { value: 'profile', label: 'Company profile' },
  { value: 'financials', label: 'Financials' },
  { value: 'market', label: 'Market data' },
  { value: 'social', label: 'Social & brand' },
]
