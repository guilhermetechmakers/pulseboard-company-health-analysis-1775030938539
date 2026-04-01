import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type CompanyActivityKind = 'analysis_history' | 'user_log' | 'sync_hint'

export interface CompanyActivityFeedItem {
  id: string
  kind: CompanyActivityKind
  title: string
  detail: string
  createdAt: string
}

type AnalysisRow = Database['public']['Tables']['analysis_history']['Row']
type UserLogRow = Database['public']['Tables']['user_activity_logs']['Row']

function matchesCompany(meta: Record<string, unknown>, companyId: string): boolean {
  const cid = meta.companyId ?? meta.company_id
  return typeof cid === 'string' && cid === companyId
}

export function useCompanyActivityFeed(companyId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['company-activity-feed', companyId, userId],
    enabled: Boolean(supabase && companyId && userId),
    staleTime: 60_000,
    queryFn: async (): Promise<CompanyActivityFeedItem[]> => {
      if (!supabase || !companyId || !userId) return []

      const [histRes, logsRes] = await Promise.all([
        supabase
          .from('analysis_history')
          .select('id, summary, details, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('user_activity_logs')
          .select('id, action, metadata, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(40),
      ])

      if (histRes.error) throw new Error(histRes.error.message)
      if (logsRes.error) throw new Error(logsRes.error.message)

      const histRows = Array.isArray(histRes.data) ? (histRes.data as AnalysisRow[]) : []
      const logRows = Array.isArray(logsRes.data) ? (logsRes.data as UserLogRow[]) : []

      const fromHist: CompanyActivityFeedItem[] = histRows.map((r) => ({
        id: `ah-${r.id}`,
        kind: 'analysis_history' as const,
        title: 'Analysis / workspace',
        detail: (r.summary ?? '').trim() || 'Recorded event',
        createdAt: r.created_at,
      }))

      const fromLogs: CompanyActivityFeedItem[] = []
      for (const r of logRows) {
        const meta = r.metadata !== null && typeof r.metadata === 'object' && !Array.isArray(r.metadata) ? (r.metadata as Record<string, unknown>) : {}
        const workspaceScoped =
          matchesCompany(meta, companyId) ||
          ['company_created', 'company_updated_via_wizard', 'company_deleted', 'draft_saved', 'analysis_started', 'analysis_completed'].includes(r.action)
        if (!workspaceScoped) continue
        fromLogs.push({
          id: `ual-${r.id}`,
          kind: 'user_log',
          title: r.action.replace(/_/g, ' '),
          detail: typeof meta.remediation === 'string' ? meta.remediation : '',
          createdAt: r.created_at,
        })
      }

      const merged = [...fromHist, ...fromLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      const seen = new Set<string>()
      const deduped: CompanyActivityFeedItem[] = []
      for (const m of merged) {
        const key = `${m.kind}:${m.detail}:${m.createdAt}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(m)
        if (deduped.length >= 40) break
      }
      return deduped
    },
  })
}
