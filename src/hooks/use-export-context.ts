import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { invokePulseReportExportApi } from '@/lib/supabase-functions'
import type { ExportContextResponseData, ExportEmailResponseData } from '@/types/export'

export function useExportContextQuery(reportId: string | undefined) {
  return useQuery({
    queryKey: ['export-context', reportId],
    enabled: Boolean(supabase) && Boolean(reportId),
    queryFn: async (): Promise<ExportContextResponseData> => {
      if (!reportId) throw new Error('Report id required')
      return invokePulseReportExportApi<ExportContextResponseData>({ op: 'export_context', reportId })
    },
  })
}

export function useSendExportEmailLink() {
  return useMutation({
    mutationFn: async (vars: { reportId: string; exportId: string; email: string }) => {
      return invokePulseReportExportApi<ExportEmailResponseData>({
        op: 'export_email',
        reportId: vars.reportId,
        exportId: vars.exportId,
        email: vars.email.trim(),
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Email sent')
      } else {
        toast.error(data.message ?? 'Email was not sent')
      }
    },
    onError: (e: Error) => toast.error(e.message ?? 'Send failed'),
  })
}
