import { supabase } from '@/lib/supabase'
import type { ReportRow } from '@/types/analysis'
import type { CompanyHealthScoreRow } from '@/types/health-score'
import type { Database } from '@/types/database'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type AnalyticsRow = Database['public']['Tables']['company_analytics']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']
type BillingRow = Database['public']['Tables']['company_billing']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']

export type CompanyAggregatesShape = {
  financials: FinancialsRow | null
  analytics: AnalyticsRow | null
  social: SocialRow | null
  billing: BillingRow | null
  market: MarketRow | null
  latestReport: ReportRow | null
}

export async function fetchCompanyAggregatesFromSupabase(companyId: string): Promise<CompanyAggregatesShape> {
  if (!supabase) {
    return {
      financials: null,
      analytics: null,
      social: null,
      billing: null,
      market: null,
      latestReport: null,
    }
  }
  const [fin, ana, soc, bill, mkt, rep] = await Promise.all([
    supabase.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_analytics').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_billing').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('reports').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  return {
    financials: fin.data ?? null,
    analytics: ana.data ?? null,
    social: soc.data ?? null,
    billing: bill.data ?? null,
    market: mkt.data ?? null,
    latestReport: rep.data !== null ? (rep.data as ReportRow) : null,
  }
}

export async function fetchCompanyReportsFromSupabase(companyId: string): Promise<ReportRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = data ?? []
  return Array.isArray(rows) ? (rows as ReportRow[]) : []
}

export async function fetchReportFromSupabase(reportId: string): Promise<ReportRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('reports').select('*').eq('id', reportId).maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null ? (data as ReportRow) : null
}

export async function fetchCompanyHealthScoresFromSupabase(
  companyId: string,
  limit: number,
  analysisId?: string,
): Promise<CompanyHealthScoreRow[]> {
  if (!supabase) return []
  let q = supabase
    .from('company_health_scores')
    .select('*')
    .eq('company_id', companyId)
    .order('scored_at', { ascending: false })
    .limit(limit)

  if (analysisId) {
    q = q.eq('report_id', analysisId)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  const rows = data ?? []
  return Array.isArray(rows) ? (rows as CompanyHealthScoreRow[]) : []
}
