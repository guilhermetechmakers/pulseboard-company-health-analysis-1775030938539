import type { Database } from '@/types/database'

export type ExportJobRow = Database['public']['Tables']['export_jobs']['Row']
export type CompanyBrandingRow = Database['public']['Tables']['company_branding']['Row']

export type ReportExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface ReportExportResponseData {
  exportId: string
  status: ReportExportJobStatus | string
  progress?: number
  storagePath: string | null
  signedUrl: string | null
  format: 'pdf' | 'html'
  message?: string
}

export interface ExportDownloadUrlResponseData {
  signedUrl: string
  expiresIn: number
  path: string
}

export interface ExportContextResponseData {
  reportId: string
  planTier: string
  whiteLabelAllowed: boolean
}

export interface ExportStatusResponseData {
  exportId: string
  reportId: string
  status: string
  progress: number
  downloadUrl: string | null
  errorMessage: string | null
  fileSizeBytes: number | null
}

export interface ExportEmailResponseData {
  success: boolean
  message?: string
}
