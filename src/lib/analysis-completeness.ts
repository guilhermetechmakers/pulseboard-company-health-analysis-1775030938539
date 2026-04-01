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
