import type { Database } from '@/types/database'

export type ReportRow = Database['public']['Tables']['reports']['Row']
export type ReportSnapshotRow = Database['public']['Tables']['report_snapshots']['Row']

export type AnalysisDepth = 'brief' | 'standard' | 'deep'

export interface CompanyContextSlice {
  company: Database['public']['Tables']['companies']['Row'] | null
  financials: Database['public']['Tables']['company_financials']['Row'] | null
  market: Database['public']['Tables']['company_market_data']['Row'] | null
  social: Database['public']['Tables']['company_social']['Row'] | null
}

export interface CompletenessField {
  id: string
  label: string
  filled: boolean
}

export interface AnalyzeCompanyRequest {
  companyId: string
  analysisDepth: AnalysisDepth
  benchmarking: boolean
  /** Must be true — enforced server-side. */
  consent: boolean
  /** Continues a queued `reports` row (pulse-analyses-api uses `analysis_jobs` instead). */
  reportId?: string
  /** Optional copy of the report via Resend to this address (requires server secrets). */
  sendReportEmail?: boolean
  reportEmail?: string | null
}

export type AnalysisJobApiStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface AnalysisJobCreateResult {
  analysisId: string
  status: AnalysisJobApiStatus
  startedAt: string
  progress: number
}

export interface AnalysisJobResultsPreview {
  executiveSummary: string
  swot: unknown
  financial: string | null
  market: string | null
  social: string | null
  risks: string[]
  opportunities: string[]
  actionPlan: unknown
}

export interface AnalysisJobStatusPayload {
  analysisId: string
  status: AnalysisJobApiStatus
  progress: number
  logs: string[]
  startedAt?: string
  completedAt?: string
  /** Populated when the worker finishes and links a `reports` row. */
  reportId?: string | null
  error?: string | null
  results?: AnalysisJobResultsPreview
}
