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
}
