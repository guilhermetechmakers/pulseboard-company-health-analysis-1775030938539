import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAuditLogEntry,
  exportAuditLogs,
  fetchAuditLogsList,
  fetchAuditLogsStats,
} from '@/api/audit-logs'
import type { AuditLogsExportBody } from '@/types/audit-log'

const auditLogsKey = ['admin', 'audit-logs'] as const
const auditStatsKey = ['admin', 'audit-logs-stats'] as const

export function useAuditLogsStatsQuery() {
  return useQuery({
    queryKey: auditStatsKey,
    queryFn: () => fetchAuditLogsStats(),
  })
}

export function useAuditLogsQuery(params: {
  page: number
  pageSize: number
  actorId?: string
  action?: string
  targetType?: string
  startDate?: string
  endDate?: string
  search?: string
  sort?: 'asc' | 'desc'
}) {
  return useQuery({
    queryKey: [
      ...auditLogsKey,
      params.page,
      params.pageSize,
      params.actorId ?? '',
      params.action ?? '',
      params.targetType ?? '',
      params.startDate ?? '',
      params.endDate ?? '',
      params.search ?? '',
      params.sort ?? 'desc',
    ],
    queryFn: () => fetchAuditLogsList(params),
  })
}

export function useCreateAuditLogMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAuditLogEntry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: auditLogsKey })
      void qc.invalidateQueries({ queryKey: auditStatsKey })
    },
  })
}

export function useExportAuditLogsMutation() {
  return useMutation({
    mutationFn: (body: AuditLogsExportBody) => exportAuditLogs(body),
  })
}
