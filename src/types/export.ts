import type { Database } from '@/types/database'

export type ExportJobRow = Database['public']['Tables']['export_jobs']['Row']
export type CompanyBrandingRow = Database['public']['Tables']['company_branding']['Row']

export interface ReportExportResponseData {
  exportId: string
  status: string
  storagePath: string | null
  signedUrl: string | null
  format: 'pdf' | 'html'
}

export interface ExportDownloadUrlResponseData {
  signedUrl: string
  expiresIn: number
  path: string
}
