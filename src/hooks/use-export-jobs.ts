import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { invokeExportDownloadUrl, invokeReportExport } from '@/lib/supabase-functions'
import type { ExportFormValues } from '@/lib/export-schema'
import type { ExportDownloadUrlResponseData, ExportJobRow, ReportExportResponseData } from '@/types/export'

export function useExportJobsForReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['export-jobs', reportId],
    enabled: Boolean(reportId) && Boolean(supabase),
    queryFn: async (): Promise<ExportJobRow[]> => {
      if (!supabase || !reportId) return []
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) throw new Error(error.message)
      const rows = data ?? []
      return Array.isArray(rows) ? (rows as ExportJobRow[]) : []
    },
  })
}

export function useExportJob(exportId: string | undefined) {
  return useQuery({
    queryKey: ['export-job', exportId],
    enabled: Boolean(exportId) && Boolean(supabase),
    queryFn: async (): Promise<ExportJobRow | null> => {
      if (!supabase || !exportId) return null
      const { data, error } = await supabase.from('export_jobs').select('*').eq('id', exportId).maybeSingle()
      if (error) throw new Error(error.message)
      return data !== null ? (data as ExportJobRow) : null
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === 'queued' || status === 'processing' ? 2500 : false
    },
  })
}

export function useStartReportExport() {
  const queryClient = useQueryClient()
  return useMutation<{ data: ReportExportResponseData }, Error, { reportId: string; values: ExportFormValues }>({
    mutationFn: async (input) => {
      const v = input.values
      return invokeReportExport({
        reportId: input.reportId,
        sections: [...v.sections],
        orientation: v.orientation,
        pageSize: v.pageSize,
        format: v.format,
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor,
        branding: {
          includeLogo: v.includeLogo,
          logoUrl: null,
          whiteLabel: v.whiteLabel,
          colorScheme: null,
        },
        delivery: {
          notifyByEmail: v.notifyByEmail,
          email: v.notifyByEmail ? v.deliveryEmail.trim() : null,
        },
      })
    },
    onSuccess: async (res, vars) => {
      const st = res?.data?.status
      if (st === 'queued') {
        toast.info('Export queued — generating your file…')
      }
      /* Completed exports: page shows download + toast after signed URL (sync or poll). */
      await queryClient.invalidateQueries({ queryKey: ['export-jobs', vars.reportId] })
      const exportId = res?.data?.exportId
      if (exportId) {
        await queryClient.invalidateQueries({ queryKey: ['export-job', exportId] })
      }
    },
    onError: (e: Error) => toast.error(e.message ?? 'Export failed'),
  })
}

export function useRefreshExportDownloadUrl() {
  return useMutation<{ data: ExportDownloadUrlResponseData }, Error, { exportId: string; expiresIn?: number }>({
    mutationFn: async (input) => {
      return invokeExportDownloadUrl({ exportId: input.exportId, expiresIn: input.expiresIn ?? 3600 })
    },
    onSuccess: () => {
      toast.success('Download link refreshed')
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not refresh download link'),
  })
}
