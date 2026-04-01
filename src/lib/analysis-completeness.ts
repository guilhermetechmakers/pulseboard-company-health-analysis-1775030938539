import type { Database } from '@/types/database'
import type { CompletenessField } from '@/types/analysis'

type Company = Database['public']['Tables']['companies']['Row']
type Financials = Database['public']['Tables']['company_financials']['Row']
type Market = Database['public']['Tables']['company_market_data']['Row']
type Social = Database['public']['Tables']['company_social']['Row']

export function buildCompletenessFields(
  company: Company | null,
  financials: Financials | null,
  market: Market | null,
  social: Social | null,
): CompletenessField[] {
  const c = company
  const fin = financials
  const m = market
  const s = social

  const competitors = Array.isArray(m?.competitors) ? m.competitors : []

  return [
    { id: 'profile_name', label: 'Company name', filled: Boolean(c?.name?.trim()) },
    { id: 'profile_industry', label: 'Industry', filled: Boolean(c?.industry?.trim()) },
    { id: 'profile_website', label: 'Website', filled: Boolean(c?.website?.trim()) },
    { id: 'profile_goals', label: 'Goals / strategy notes', filled: Boolean(c?.goals?.trim()) },
    { id: 'fin_revenue', label: 'Revenue (financials)', filled: fin?.revenue != null },
    { id: 'fin_cash', label: 'Cash position', filled: fin?.cash != null },
    { id: 'market_competitors', label: 'Competitor signals', filled: competitors.length > 0 },
    { id: 'social_followers', label: 'Social / brand metrics', filled: s?.followers != null || s?.engagement_rate != null },
  ]
}

export function completenessPercent(fields: CompletenessField[]): number {
  const list = Array.isArray(fields) ? fields : []
  if (list.length === 0) return 0
  const filled = list.filter((f) => f.filled).length
  return Math.round((filled / list.length) * 100)
}

/** Minimum structured inputs before standard analysis is enabled (profile + at least one domain slice). */
export function isGenerateAnalysisDataReady(fields: CompletenessField[]): boolean {
  const list = Array.isArray(fields) ? fields : []
  const byId = (id: string): boolean => Boolean(list.find((f) => f.id === id)?.filled)
  const hasProfile = byId('profile_name') && byId('profile_industry')
  const hasSlice =
    byId('fin_revenue') || byId('market_competitors') || byId('social_followers')
  return hasProfile && hasSlice
}

/** Minimum slices required before Start analysis is enabled (with consent). */
export function coreAnalysisReadiness(fields: CompletenessField[]): {
  profileOk: boolean
  financialOk: boolean
  marketOk: boolean
  socialOk: boolean
  allCoreMet: boolean
} {
  const list = Array.isArray(fields) ? fields : []
  const filled = (id: string) => list.find((f) => f.id === id)?.filled ?? false
  const profileOk = filled('profile_name') && filled('profile_industry')
  const financialOk = filled('fin_revenue') || filled('fin_cash')
  const marketOk = filled('market_competitors')
  const socialOk = filled('social_followers')
  return {
    profileOk,
    financialOk,
    marketOk,
    socialOk,
    allCoreMet: profileOk && financialOk && marketOk && socialOk,
  }
}

/** Minimum data required before enabling Generate Analysis (standard depth). */
const REQUIRED_FOR_ANALYSIS_IDS = ['profile_name', 'profile_industry', 'fin_revenue', 'market_competitors'] as const

export function isReadyForStandardAnalysis(fields: CompletenessField[]): boolean {
  const list = Array.isArray(fields) ? fields : []
  return REQUIRED_FOR_ANALYSIS_IDS.every((id) => Boolean(list.find((f) => f.id === id)?.filled))
}
