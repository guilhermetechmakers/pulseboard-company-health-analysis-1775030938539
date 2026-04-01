import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import {
  fetchCompanyAggregatesFromSupabase,
  type CompanyAggregatesShape,
} from '@/lib/company-data-fetch'
import { invokePulseCacheApi } from '@/lib/pulse-cache-api'
import { asArray } from '@/lib/safe-data'
import { supabase } from '@/lib/supabase'
import type { PulseCacheMeta } from '@/types/pulse-cache'
import type { ReportRow } from '@/types/analysis'

export type CompanyAggregatesData = CompanyAggregatesShape & {
  pulseCache?: PulseCacheMeta
}

const emptyAgg: CompanyAggregatesShape = {
  financials: null,
  analytics: null,
  social: null,
  billing: null,
  market: null,
  latestReport: null,
}

function normalizeProfileBundle(raw: Record<string, unknown> | null): CompanyAggregatesShape {
  if (!raw || typeof raw !== 'object') {
    return { ...emptyAgg }
  }
  const latest = raw.latestReport
  return {
    financials: (raw.financials ?? null) as CompanyAggregatesShape['financials'],
    analytics: (raw.analytics ?? null) as CompanyAggregatesShape['analytics'],
    social: (raw.social ?? null) as CompanyAggregatesShape['social'],
    billing: (raw.billing ?? null) as CompanyAggregatesShape['billing'],
    market: (raw.market ?? null) as CompanyAggregatesShape['market'],
    latestReport: latest !== null && typeof latest === 'object' ? (latest as ReportRow) : null,
  }
}

export function useCompanyAggregates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-aggregates', companyId],
    enabled: Boolean(supabase && companyId),
    staleTime: QUERY_STALE_MS.aggregates,
    queryFn: async (): Promise<CompanyAggregatesData> => {
      if (!supabase || !companyId) {
        return { ...emptyAgg }
      }

      try {
        const res = await invokePulseCacheApi<Record<string, unknown>>({
          op: 'get_company_profile',
          companyId,
        })
        if (res.data && !res.error) {
          const bundle = normalizeProfileBundle(res.data)
          return {
            ...bundle,
            pulseCache: res.meta ?? undefined,
          }
        }
      } catch {
        /* fall through */
      }

      const bundle = await fetchCompanyAggregatesFromSupabase(companyId)
      return { ...bundle }
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
