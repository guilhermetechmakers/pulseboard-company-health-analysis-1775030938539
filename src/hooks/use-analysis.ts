import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { createInAppNotificationRow } from '@/api/notifications'
import { invokeAnalyzeCompanyHealth } from '@/lib/supabase-functions'
import { buildCompletenessFields, completenessPercent } from '@/lib/analysis-completeness'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import {
  fetchCompanyReportsFromSupabase,
  fetchReportFromSupabase,
} from '@/lib/company-data-fetch'
import {
  fireAndForgetInvalidateCompanyCache,
  fireAndForgetInvalidateReportCache,
  invokePulseCacheApi,
} from '@/lib/pulse-cache-api'
import type { AnalysisDepth, AnalyzeCompanyRequest, ReportRow, ReportSnapshotRow } from '@/types/analysis'
import type { Database } from '@/types/database'
import type { PulseCacheMeta } from '@/types/pulse-cache'

type Company = Database['public']['Tables']['companies']['Row']
type Financials = Database['public']['Tables']['company_financials']['Row']
type Market = Database['public']['Tables']['company_market_data']['Row']
type Social = Database['public']['Tables']['company_social']['Row']

async function fetchCompanyContext(companyId: string): Promise<{
  financials: Financials | null
  market: Market | null
  social: Social | null
}> {
  if (!supabase) {
    return { financials: null, market: null, social: null }
  }
  const [fin, market, social] = await Promise.all([
    supabase.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
  ])
  return {
    financials: fin.data ?? null,
    market: market.data ?? null,
    social: social.data ?? null,
  }
}

export function useCompanyAnalysisContext(companyId: string | null) {
  return useQuery({
    queryKey: ['company-analysis-context', companyId],
    enabled: Boolean(companyId) && Boolean(supabase),
    queryFn: async () => {
      if (!companyId) {
        return {
          financials: null as Financials | null,
          market: null as Market | null,
          social: null as Social | null,
        }
      }
      return fetchCompanyContext(companyId)
    },
  })
}

export function useCompleteness(company: Company | null | undefined, context: ReturnType<typeof useCompanyAnalysisContext>['data']) {
  const financials = context?.financials ?? null
  const market = context?.market ?? null
  const social = context?.social ?? null
  const fields = buildCompletenessFields(company ?? null, financials, market, social)
  return {
    fields,
    percent: completenessPercent(fields),
  }
}

export type CompanyReportsQueryData = {
  reports: ReportRow[]
  pulseCache?: PulseCacheMeta
}

export function useCompanyReports(companyId: string | null) {
  const query = useQuery({
    queryKey: ['company-reports', companyId],
    enabled: Boolean(companyId) && Boolean(supabase),
    staleTime: QUERY_STALE_MS.companyReports,
    queryFn: async (): Promise<CompanyReportsQueryData> => {
      if (!supabase || !companyId) {
        return { reports: [] }
      }
      try {
        const res = await invokePulseCacheApi<unknown[]>({
          op: 'get_company_analyses',
          companyId,
        })
        if (res.data && !res.error && Array.isArray(res.data)) {
          return {
            reports: res.data as ReportRow[],
            pulseCache: res.meta ?? undefined,
          }
        }
      } catch {
        /* fallback */
      }
      const reports = await fetchCompanyReportsFromSupabase(companyId)
      return { reports }
    },
  })
  const raw = query.data
  const reports = Array.isArray(raw?.reports) ? raw.reports : []
  return {
    ...query,
    data: reports,
    pulseCache: raw?.pulseCache,
  }
}

export type ReportQueryData = {
  row: ReportRow | null
  pulseCache?: PulseCacheMeta
}

export function useReport(reportId: string | undefined) {
  const query = useQuery({
    queryKey: ['report', reportId],
    enabled: Boolean(reportId) && Boolean(supabase),
    staleTime: QUERY_STALE_MS.report,
    queryFn: async (): Promise<ReportQueryData> => {
      if (!supabase || !reportId) {
        return { row: null }
      }
      try {
        const res = await invokePulseCacheApi<Record<string, unknown>>({
          op: 'get_report',
          reportId,
        })
        if (res.data && !res.error && typeof res.data === 'object') {
          return {
            row: res.data as ReportRow,
            pulseCache: res.meta ?? undefined,
          }
        }
      } catch {
        /* fallback */
      }
      const row = await fetchReportFromSupabase(reportId)
      return { row }
    },
  })
  return {
    ...query,
    data: query.data?.row ?? null,
    pulseCache: query.data?.pulseCache,
  }
}

export function useReportSnapshots(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report-snapshots', reportId],
    enabled: Boolean(reportId) && Boolean(supabase),
    staleTime: QUERY_STALE_MS.reportSnapshots,
    queryFn: async (): Promise<ReportSnapshotRow[]> => {
      if (!supabase || !reportId) return []
      const { data, error } = await supabase
        .from('report_snapshots')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      const rows = data ?? []
      return Array.isArray(rows) ? (rows as ReportSnapshotRow[]) : []
    },
  })
}

export function useRunAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { companyId: string; analysisDepth: AnalysisDepth; benchmarking: boolean }) => {
      const body: AnalyzeCompanyRequest = {
        companyId: input.companyId,
        analysisDepth: input.analysisDepth,
        benchmarking: input.benchmarking,
        consent: true,
      }
      return invokeAnalyzeCompanyHealth(body)
    },
    onSuccess: async (_res, vars) => {
      toast.success('Analysis completed')
      fireAndForgetInvalidateCompanyCache(vars.companyId)
      await queryClient.invalidateQueries({ queryKey: ['pulse-notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['company-reports', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-activity-feed'] })
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Analysis failed')
    },
  })
}

export function useUpdateReportSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      reportId: string
      patch: Partial<{
        executive_summary: string | null
        financial_analysis: string | null
        market_analysis: string | null
        social_analysis: string | null
      }>
    }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase.from('reports').update({ ...input.patch, updated_at: new Date().toISOString() }).eq('id', input.reportId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('Report saved')
      const rep = queryClient.getQueryData<ReportQueryData>(['report', vars.reportId])
      const cid = rep?.row?.company_id
      fireAndForgetInvalidateReportCache(vars.reportId, typeof cid === 'string' ? cid : undefined)
      await queryClient.invalidateQueries({ queryKey: ['report', vars.reportId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })
}

export function useCreateReportSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { reportId: string; label: string; sections: Record<string, string> }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error } = await supabase.from('report_snapshots').insert({
        report_id: input.reportId,
        label: input.label,
        sections: input.sections as Record<string, unknown>,
        created_by: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('Snapshot saved')
      const rep = queryClient.getQueryData<ReportQueryData>(['report', vars.reportId])
      const cid = rep?.row?.company_id
      fireAndForgetInvalidateReportCache(vars.reportId, typeof cid === 'string' ? cid : undefined)
      try {
        await createInAppNotificationRow({
          type: 'snapshot_created',
          message: `Snapshot “${vars.label}” saved for this report.`,
          data: { reportId: vars.reportId, label: vars.label },
        })
      } catch {
        /* non-blocking */
      }
      await queryClient.invalidateQueries({ queryKey: ['pulse-notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['report-snapshots', vars.reportId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Snapshot failed'),
  })
}
