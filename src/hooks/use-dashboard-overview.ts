import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import { invokePulseDashboardApi } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import type { DashboardOverviewPayload } from '@/types/dashboard'

export const dashboardOverviewQueryKey = (companyId: string | undefined) => ['dashboard-overview', companyId] as const

export function useDashboardOverview(companyId: string | undefined) {
  return useQuery({
    queryKey: dashboardOverviewQueryKey(companyId),
    enabled: Boolean(supabase && companyId),
    staleTime: QUERY_STALE_MS.aggregates,
    queryFn: async (): Promise<DashboardOverviewPayload | null> => {
      if (!companyId) return null
      try {
        const res = await invokePulseDashboardApi({ companyId })
        return res.data
      } catch {
        return null
      }
    },
  })
}

/** Normalized overview: never null arrays; safe when Edge Function is unavailable. */
export function useDashboardOverviewSafe(companyId: string | undefined) {
  const q = useDashboardOverview(companyId)
  const d = q.data
  const financialSnapshot = d?.financialSnapshot ?? null
  return {
    ...q,
    data: d ?? null,
    recentReports: Array.isArray(d?.recentReports) ? d.recentReports : [],
    healthSparkline: Array.isArray(d?.healthSparkline) ? d.healthSparkline : [],
    integrations: Array.isArray(d?.integrations) ? d.integrations : [],
    unreadInboxCount:
      typeof d?.unreadInboxCount === 'number' && Number.isFinite(d.unreadInboxCount) ? d.unreadInboxCount : 0,
    financialSnapshot,
  }
}
