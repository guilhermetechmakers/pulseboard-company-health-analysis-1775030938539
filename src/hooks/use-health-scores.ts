import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { invokeComputeHealthScore } from '@/lib/supabase-functions'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import { fetchCompanyHealthScoresFromSupabase } from '@/lib/company-data-fetch'
import { fireAndForgetInvalidateCompanyCache, invokePulseCacheApi } from '@/lib/pulse-cache-api'
import type { CompanyHealthScoreRow, CompanyInputSnapshotRow } from '@/types/health-score'
import type { CompanyRow } from '@/types/integrations'
import type { Database } from '@/types/database'
import type { PulseCacheMeta } from '@/types/pulse-cache'

type FinancialsRow = Database['public']['Tables']['company_financials']['Row']
type MarketRow = Database['public']['Tables']['company_market_data']['Row']
type SocialRow = Database['public']['Tables']['company_social']['Row']

export type HealthScoresQueryData = {
  rows: CompanyHealthScoreRow[]
  pulseCache?: PulseCacheMeta
}

export function useCompanyHealthScores(companyId: string | null | undefined, limit = 24) {
  const q = useQuery({
    queryKey: ['company-health-scores', companyId, limit],
    enabled: Boolean(supabase && companyId),
    staleTime: QUERY_STALE_MS.healthScores,
    queryFn: async (): Promise<HealthScoresQueryData> => {
      if (!supabase || !companyId) {
        return { rows: [] }
      }
      try {
        const res = await invokePulseCacheApi<unknown[]>({
          op: 'get_company_health',
          companyId,
          limit,
        })
        if (res.data && !res.error && Array.isArray(res.data)) {
          return {
            rows: res.data as CompanyHealthScoreRow[],
            pulseCache: res.meta ?? undefined,
          }
        }
      } catch {
        /* fallback */
      }
      const rows = await fetchCompanyHealthScoresFromSupabase(companyId, limit)
      return { rows }
    },
  })
  const rows = Array.isArray(q.data?.rows) ? q.data.rows : []
  return {
    ...q,
    data: rows,
    pulseCache: q.data?.pulseCache,
  }
}

export function useComputeHealthScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { companyId: string; benchmarks?: Record<string, unknown>; notes?: string }) => {
      return invokeComputeHealthScore(input)
    },
    onSuccess: async (_res, vars) => {
      toast.success('Health score updated')
      fireAndForgetInvalidateCompanyCache(vars.companyId)
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', vars.companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not compute health score'),
  })
}

export function useCompanyInputSnapshots(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['company-input-snapshots', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: async (): Promise<CompanyInputSnapshotRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('company_input_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      const rows = data ?? []
      return Array.isArray(rows) ? (rows as CompanyInputSnapshotRow[]) : []
    },
  })
}

export function useSaveCompanyInputSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      companyId: string
      label: string
      company: CompanyRow
      financials: FinancialsRow | null
      market: MarketRow | null
      social: SocialRow | null
    }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const payload = {
        company: {
          name: input.company.name,
          industry: input.company.industry,
          stage: input.company.stage,
          website: input.company.website,
          business_model: input.company.business_model,
          target_customer: input.company.target_customer,
          goals: input.company.goals,
          products: input.company.products,
        },
        financials: input.financials,
        market: input.market,
        social: input.social,
      }
      const { error } = await supabase.from('company_input_snapshots').insert({
        company_id: input.companyId,
        label: input.label,
        payload: payload as Record<string, unknown>,
        created_by: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('Input snapshot saved')
      await queryClient.invalidateQueries({ queryKey: ['company-input-snapshots', vars.companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Snapshot failed'),
  })
}

export function useRestoreCompanyInputSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { snapshot: CompanyInputSnapshotRow; companyId: string }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const p = input.snapshot.payload
      if (p === null || typeof p !== 'object' || Array.isArray(p)) {
        throw new Error('Invalid snapshot payload')
      }
      const payload = p as Record<string, unknown>
      const companyPatch = payload.company
      const fin = payload.financials
      const mkt = payload.market
      const soc = payload.social

      if (companyPatch !== null && typeof companyPatch === 'object' && !Array.isArray(companyPatch)) {
        const c = companyPatch as Record<string, unknown>
        const updates: Record<string, string | null> = {}
        if (typeof c.name === 'string') updates.name = c.name
        if (typeof c.industry === 'string' || c.industry === null) updates.industry = c.industry as string | null
        if (typeof c.stage === 'string' || c.stage === null) updates.stage = c.stage as string | null
        if (typeof c.website === 'string' || c.website === null) updates.website = c.website as string | null
        if (typeof c.business_model === 'string' || c.business_model === null)
          updates.business_model = c.business_model as string | null
        if (typeof c.target_customer === 'string' || c.target_customer === null)
          updates.target_customer = c.target_customer as string | null
        if (typeof c.goals === 'string' || c.goals === null) updates.goals = c.goals as string | null
        if (typeof c.products === 'string' || c.products === null) updates.products = c.products as string | null
        if (Object.keys(updates).length > 0) {
          const { error: cErr } = await supabase
            .from('companies')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', input.companyId)
          if (cErr) throw new Error(cErr.message)
        }
      }

      if (fin !== null && typeof fin === 'object' && !Array.isArray(fin)) {
        const row = fin as Record<string, unknown>
        const { error: fErr } = await supabase.from('company_financials').upsert(
          {
            company_id: input.companyId,
            revenue: typeof row.revenue === 'number' ? row.revenue : null,
            expenses: typeof row.expenses === 'number' ? row.expenses : null,
            profit: typeof row.profit === 'number' ? row.profit : null,
            cash: typeof row.cash === 'number' ? row.cash : null,
            debt: typeof row.debt === 'number' ? row.debt : null,
            assets: typeof row.assets === 'number' ? row.assets : null,
            liabilities: typeof row.liabilities === 'number' ? row.liabilities : null,
            per_month_metrics: Array.isArray(row.per_month_metrics) ? row.per_month_metrics : [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id' },
        )
        if (fErr) throw new Error(fErr.message)
      }

      if (mkt !== null && typeof mkt === 'object' && !Array.isArray(mkt)) {
        const row = mkt as Record<string, unknown>
        const { error: mErr } = await supabase.from('company_market_data').upsert(
          {
            company_id: input.companyId,
            competitors: Array.isArray(row.competitors) ? row.competitors : [],
            pricing_matrix: Array.isArray(row.pricing_matrix) ? row.pricing_matrix : [],
            trends: Array.isArray(row.trends) ? row.trends : [],
            opportunities: Array.isArray(row.opportunities) ? row.opportunities : [],
            threats: Array.isArray(row.threats) ? row.threats : [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id' },
        )
        if (mErr) throw new Error(mErr.message)
      }

      if (soc !== null && typeof soc === 'object' && !Array.isArray(soc)) {
        const row = soc as Record<string, unknown>
        const { error: sErr } = await supabase.from('company_social').upsert(
          {
            company_id: input.companyId,
            followers: typeof row.followers === 'number' ? row.followers : row.followers === null ? null : undefined,
            engagement_rate:
              typeof row.engagement_rate === 'number' ? row.engagement_rate : row.engagement_rate === null ? null : undefined,
            posts_count: typeof row.posts_count === 'number' ? row.posts_count : row.posts_count === null ? null : undefined,
            website_traffic:
              typeof row.website_traffic === 'number' ? row.website_traffic : row.website_traffic === null ? null : undefined,
            impressions: typeof row.impressions === 'number' ? row.impressions : row.impressions === null ? null : undefined,
            clicks: typeof row.clicks === 'number' ? row.clicks : row.clicks === null ? null : undefined,
            brand_mentions: Array.isArray(row.brand_mentions) ? row.brand_mentions : [],
            post_metrics: Array.isArray(row.post_metrics) ? row.post_metrics : [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id' },
        )
        if (sErr) throw new Error(sErr.message)
      }
    },
    onSuccess: async (_d, vars) => {
      toast.success('Restored snapshot')
      fireAndForgetInvalidateCompanyCache(vars.companyId)
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-analysis-context', vars.companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Restore failed'),
  })
}
