import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { createInAppNotificationRow } from '@/api/notifications'
import { createAnalysisRecord, fetchAnalysisStatus } from '@/api/analyses'
import { invokeAnalyzeCompanyHealth, invokePulseReportViewerApi } from '@/lib/supabase-functions'
import { buildCompletenessFields, completenessPercent } from '@/lib/analysis-completeness'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import { dashboardOverviewQueryKey } from '@/hooks/use-dashboard-overview'
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
import type { AnalysisStatusResponseData } from '@/types/analysis-job'
import type { CompanyHealthScoreRow } from '@/types/health-score'
import type { ReportTextSectionKey } from '@/types/report-viewer'
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

const ANALYSIS_POLL_MS = 1600
const ANALYSIS_MAX_POLLS = 240

export async function waitForAnalysisJobCompletion(
  analysisId: string,
  onTick?: (payload: AnalysisStatusResponseData) => void,
): Promise<AnalysisStatusResponseData> {
  let polls = 0
  while (polls < ANALYSIS_MAX_POLLS) {
    polls += 1
    const st = await fetchAnalysisStatus(analysisId)
    onTick?.(st)
    if (st.status === 'completed') return st
    if (st.status === 'failed') {
      const last = (st.logs ?? []).length > 0 ? (st.logs ?? [])[(st.logs ?? []).length - 1] : 'Analysis failed'
      throw new Error(typeof st.error === 'string' && st.error.trim() ? st.error : last)
    }
    await new Promise((r) => setTimeout(r, ANALYSIS_POLL_MS))
  }
  throw new Error('Analysis timed out — check Reports or try again.')
}

/** Queued job + polling (`pulse-analyses-api` / `analysis_jobs`). Preferred for Generate Analysis UI. */
export function useRunAnalysisJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      companyId: string
      depth: AnalysisDepth
      includeBenchmarks: boolean
      sendToEmail: boolean
      email?: string
      consentGiven: boolean
      onProgress?: (s: AnalysisStatusResponseData) => void
    }) => {
      const created = await createAnalysisRecord({
        companyId: input.companyId,
        depth: input.depth,
        includeBenchmarks: input.includeBenchmarks,
        sendToEmail: input.sendToEmail,
        email: input.email,
        consentGiven: input.consentGiven,
      })
      const final = await waitForAnalysisJobCompletion(created.analysisId, input.onProgress)
      return { created, final }
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
      await queryClient.invalidateQueries({ queryKey: dashboardOverviewQueryKey(vars.companyId) })
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Analysis failed')
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
      await queryClient.invalidateQueries({ queryKey: dashboardOverviewQueryKey(vars.companyId) })
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Analysis failed')
    },
  })
}

export type { ReportTextSectionKey } from '@/types/report-viewer'

export function useUpdateReportSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { reportId: string; sectionKey: ReportTextSectionKey; content: string }) => {
      try {
        await invokePulseReportViewerApi({ op: 'update_section', ...input })
        return
      } catch {
        if (!supabase) throw new Error('Supabase is not configured')
        const { error } = await supabase
          .from('reports')
          .update({ [input.sectionKey]: input.content, updated_at: new Date().toISOString() })
          .eq('id', input.reportId)
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: async (_d, vars) => {
      const rep = queryClient.getQueryData<ReportQueryData>(['report', vars.reportId])
      const cid = rep?.row?.company_id
      fireAndForgetInvalidateReportCache(vars.reportId, typeof cid === 'string' ? cid : undefined)
      await queryClient.invalidateQueries({ queryKey: ['report', vars.reportId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Save failed'),
  })
}

export function useUpdateReportSwot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { reportId: string; swot: Record<string, unknown> }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase
        .from('reports')
        .update({ swot: input.swot, updated_at: new Date().toISOString() })
        .eq('id', input.reportId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('SWOT updated')
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
    mutationFn: async (input: { reportId: string; label: string; notes?: string; sections: Record<string, string> }) => {
      const sectionsPayload = input.sections as Record<string, unknown>
      try {
        await invokePulseReportViewerApi({
          op: 'create_snapshot',
          reportId: input.reportId,
          label: input.label,
          notes: input.notes,
          sections: sectionsPayload,
        })
        return
      } catch {
        if (!supabase) throw new Error('Supabase is not configured')
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('report_snapshots').insert({
          report_id: input.reportId,
          label: input.label,
          notes: input.notes ?? null,
          sections: sectionsPayload,
          created_by: user?.id ?? null,
        })
        if (error) throw new Error(error.message)
      }
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

export function useRestoreReportSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { reportId: string; snapshot: ReportSnapshotRow }) => {
      try {
        await invokePulseReportViewerApi({
          op: 'restore_snapshot',
          reportId: input.reportId,
          snapshotId: input.snapshot.id,
        })
        return
      } catch {
        /* fallback when Edge Function unavailable */
      }
      if (!supabase) throw new Error('Supabase is not configured')
      const raw = input.snapshot.sections
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('Invalid snapshot data')
      }
      const s = raw as Record<string, unknown>
      const getStr = (k: string): string => (typeof s[k] === 'string' ? (s[k] as string) : '')

      let swotPatch: Record<string, unknown> | undefined
      if (typeof s.swot_json === 'string' && s.swot_json.trim().length > 0) {
        try {
          const p = JSON.parse(s.swot_json) as unknown
          if (p !== null && typeof p === 'object' && !Array.isArray(p)) {
            swotPatch = p as Record<string, unknown>
          }
        } catch {
          /* keep undefined */
        }
      }

      const patch: Record<string, unknown> = {
        executive_summary: getStr('executive_summary') || null,
        financial_analysis: getStr('financial_analysis') || null,
        market_analysis: getStr('market_analysis') || null,
        social_analysis: getStr('social_analysis') || null,
        updated_at: new Date().toISOString(),
      }
      if (swotPatch !== undefined) {
        patch.swot = swotPatch
      }

      const { error } = await supabase.from('reports').update(patch).eq('id', input.reportId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('Snapshot restored')
      const rep = queryClient.getQueryData<ReportQueryData>(['report', vars.reportId])
      const cid = rep?.row?.company_id
      fireAndForgetInvalidateReportCache(vars.reportId, typeof cid === 'string' ? cid : undefined)
      await queryClient.invalidateQueries({ queryKey: ['report', vars.reportId] })
      await queryClient.invalidateQueries({ queryKey: ['report-health', vars.reportId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Restore failed'),
  })
}

export function useReportHealthForAnalysis(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report-health', reportId],
    enabled: Boolean(supabase && reportId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!supabase || !reportId) {
        return { row: null as CompanyHealthScoreRow | null, embedded: {} as Record<string, unknown> }
      }
      try {
        return await invokePulseReportViewerApi<{ row: CompanyHealthScoreRow | null; embedded: Record<string, unknown> }>({
          op: 'get_health',
          reportId,
        })
      } catch {
        const { data: row } = await supabase
          .from('company_health_scores')
          .select('*')
          .eq('report_id', reportId)
          .order('scored_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const { data: rep } = await supabase.from('reports').select('health_scores').eq('id', reportId).maybeSingle()
        const emb = rep?.health_scores
        const embedded =
          emb !== null && typeof emb === 'object' && !Array.isArray(emb) ? (emb as Record<string, unknown>) : {}
        return { row: row !== null ? (row as CompanyHealthScoreRow) : null, embedded }
      }
    },
  })
}
