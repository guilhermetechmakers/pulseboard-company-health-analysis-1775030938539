import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { asArray } from '@/lib/safe-data'

export function useCompanyAggregates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-aggregates', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: async () => {
      if (!supabase || !companyId) {
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
        latestReport: rep.data ?? null,
      }
    },
  })
}

export function hasFinancialSignals(fin: unknown): boolean {
  const f = fin as Record<string, unknown> | null
  if (!f) return false
  return ['revenue', 'expenses', 'profit', 'cash'].some((k) => f[k] != null)
}

export function hasMarketSignals(mkt: unknown): boolean {
  const m = mkt as Record<string, unknown> | null
  if (!m) return false
  return asArray(m.competitors).length > 0 || asArray(m.trends).length > 0
}

export function hasSocialSignals(soc: unknown): boolean {
  const s = soc as Record<string, unknown> | null
  if (!s) return false
  return (
    s.followers != null ||
    s.impressions != null ||
    asArray(s.post_metrics).length > 0 ||
    asArray(s.brand_mentions).length > 0
  )
}
