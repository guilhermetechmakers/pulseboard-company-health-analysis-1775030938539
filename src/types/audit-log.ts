export type AuditLogTarget = Record<string, unknown>

/** Normalized audit log row returned by admin-api (maps DB columns to API shape). */
export type AuditLogApiRow = {
  id: string
  actorId: string | null
  action: string
  entity: string
  entityId: string | null
  target: AuditLogTarget
  metadata: AuditLogTarget
  notes: string | null
  createdAt: string
  actorEmail: string
  actorName: string
}

export type AuditLogsListResponse = {
  total: number
  page: number
  pageSize: number
  logs: AuditLogApiRow[]
}

export type AuditLogsStatsResponse = {
  total: number
  last24h: number
  series: { date: string; count: number }[]
}

export type AuditLogsExportBody = {
  format: 'csv' | 'json'
  filters: Record<string, unknown>
}

export type AuditLogsExportResponse = {
  url: string
}
