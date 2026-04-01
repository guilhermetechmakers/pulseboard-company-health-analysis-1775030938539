import type { Database } from '@/types/database'

export type DashboardCompanySnippet = Pick<
  Database['public']['Tables']['companies']['Row'],
  'id' | 'name' | 'industry' | 'health_scores' | 'updated_at' | 'last_analysis_at'
>

export type DashboardReportSnippet = Pick<
  Database['public']['Tables']['reports']['Row'],
  | 'id'
  | 'company_id'
  | 'status'
  | 'executive_summary'
  | 'created_at'
  | 'analysis_depth'
  | 'health_scores'
  | 'action_plan'
  | 'risks'
>

export type DashboardHealthSparkPoint = Pick<
  Database['public']['Tables']['company_health_scores']['Row'],
  'scored_at' | 'overall' | 'financial' | 'market' | 'brand_social'
>

export type DashboardIntegrationSnippet = Pick<
  Database['public']['Tables']['integrations']['Row'],
  'id' | 'provider' | 'status' | 'last_synced_at'
>

export interface DashboardFinancialSnapshot {
  revenue: number | null
  profit: number | null
  cash: number | null
}

export interface DashboardOverviewPayload {
  company: DashboardCompanySnippet
  recentReports: DashboardReportSnippet[]
  healthSparkline: DashboardHealthSparkPoint[]
  integrations: DashboardIntegrationSnippet[]
  unreadInboxCount: number
  financialSnapshot: DashboardFinancialSnapshot | null
}

export interface DashboardOverviewResponse {
  data: DashboardOverviewPayload
}
