import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { createInAppNotificationRow } from '@/api/notifications'
import { invokeAnalyzeCompanyHealth } from '@/lib/supabase-functions'
import { buildCompletenessFields, completenessPercent } from '@/lib/analysis-completeness'
import type { AnalysisDepth, AnalyzeCompanyRequest, ReportRow, ReportSnapshotRow } from '@/types/analysis'
import type { Database } from '@/types/database'

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

export function useCompanyReports(companyId: string | null) {
  return useQuery({
    queryKey: ['company-reports', companyId],
    enabled: Boolean(companyId) && Boolean(supabase),
    queryFn: async (): Promise<ReportRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      const rows = data ?? []
      return Array.isArray(rows) ? (rows as ReportRow[]) : []
    },
  })
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report', reportId],
    enabled: Boolean(reportId) && Boolean(supabase),
    queryFn: async (): Promise<ReportRow | null> => {
      if (!supabase || !reportId) return null
      const { data, error } = await supabase.from('reports').select('*').eq('id', reportId).maybeSingle()
      if (error) throw new Error(error.message)
      return data !== null ? (data as ReportRow) : null
    },
  })
}

export function useReportSnapshots(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report-snapshots', reportId],
    enabled: Boolean(reportId) && Boolean(supabase),
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
      await queryClient.invalidateQueries({ queryKey: ['pulse-notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['company-reports', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company-aggregates', vars.companyId] })
      await queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      await queryClient.invalidateQueries({ queryKey: ['company-health-scores', vars.companyId] })
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
