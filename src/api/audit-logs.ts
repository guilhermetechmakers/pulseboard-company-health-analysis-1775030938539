/**
 * Admin audit logs — invokes `admin-api` Edge Function; null-safe normalization.
 */
import { invokeAdminApi } from '@/lib/supabase-functions'
import type {
  AuditLogApiRow,
  AuditLogsExportBody,
  AuditLogsExportResponse,
  AuditLogsListResponse,
  AuditLogsStatsResponse,
} from '@/types/audit-log'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function unwrapData(res: Record<string, unknown>): unknown {
  return isRecord(res.data) ? res.data : res
}

export function normalizeAuditLogRow(raw: unknown): AuditLogApiRow | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id) return null
  const targetRaw = raw.target
  const target = isRecord(targetRaw) ? { ...targetRaw } : {}
  const metaRaw = raw.metadata
  const metadata = isRecord(metaRaw) ? { ...metaRaw } : {}
  return {
    id,
    actorId: typeof raw.actorId === 'string' ? raw.actorId : null,
    action: typeof raw.action === 'string' ? raw.action : '',
    entity: typeof raw.entity === 'string' ? raw.entity : '',
    entityId: typeof raw.entityId === 'string' ? raw.entityId : null,
    target,
    metadata,
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    actorEmail: typeof raw.actorEmail === 'string' ? raw.actorEmail : '',
    actorName: typeof raw.actorName === 'string' ? raw.actorName : '',
  }
}

export function normalizeAuditLogsListResponse(raw: unknown): AuditLogsListResponse {
  const r = isRecord(raw) ? raw : {}
  const logsRaw = r.logs
  const list = Array.isArray(logsRaw) ? logsRaw : []
  const logs = list.map((row) => normalizeAuditLogRow(row)).filter((x): x is AuditLogApiRow => x !== null)
  const total = typeof r.total === 'number' && Number.isFinite(r.total) ? r.total : logs.length
  const page = typeof r.page === 'number' && Number.isFinite(r.page) ? r.page : 1
  const pageSize = typeof r.pageSize === 'number' && Number.isFinite(r.pageSize) ? r.pageSize : 20
  return { total, page, pageSize, logs }
}

export function normalizeAuditLogsStats(raw: unknown): AuditLogsStatsResponse {
  const r = isRecord(raw) ? raw : {}
  const total = typeof r.total === 'number' && Number.isFinite(r.total) ? r.total : 0
  const last24h = typeof r.last24h === 'number' && Number.isFinite(r.last24h) ? r.last24h : 0
  const seriesRaw = r.series
  const series: { date: string; count: number }[] = []
  if (Array.isArray(seriesRaw)) {
    for (const item of seriesRaw) {
      if (!isRecord(item)) continue
      const date = typeof item.date === 'string' ? item.date : ''
      const count = typeof item.count === 'number' && Number.isFinite(item.count) ? item.count : 0
      if (date) series.push({ date, count })
    }
  }
  return { total, last24h, series }
}

export async function fetchAuditLogsList(params: {
  page: number
  pageSize: number
  actorId?: string
  action?: string
  targetType?: string
  startDate?: string
  endDate?: string
  search?: string
  sort?: 'asc' | 'desc'
}): Promise<AuditLogsListResponse> {
  const res = await invokeAdminApi({
    action: 'audit_logs_list',
    page: params.page,
    pageSize: params.pageSize,
    actorId: params.actorId ?? '',
    actionFilter: params.action ?? '',
    targetType: params.targetType ?? '',
    startDate: params.startDate ?? '',
    endDate: params.endDate ?? '',
    search: params.search ?? '',
    sort: params.sort ?? 'desc',
  })
  return normalizeAuditLogsListResponse(unwrapData(res as Record<string, unknown>))
}

export async function fetchAuditLogsStats(): Promise<AuditLogsStatsResponse> {
  const res = await invokeAdminApi({ action: 'audit_logs_stats' })
  return normalizeAuditLogsStats(unwrapData(res as Record<string, unknown>))
}

export async function createAuditLogEntry(body: {
  action: string
  actorId?: string
  target?: Record<string, unknown>
  notes?: string
}): Promise<AuditLogApiRow> {
  const res = await invokeAdminApi({
    action: 'audit_logs_create',
    logAction: body.action,
    actorId: body.actorId ?? '',
    target: body.target ?? {},
    notes: body.notes ?? '',
  })
  const row = normalizeAuditLogRow(unwrapData(res as Record<string, unknown>))
  if (!row) {
    throw new Error('Invalid audit log create response')
  }
  return row
}

export async function exportAuditLogs(body: AuditLogsExportBody): Promise<AuditLogsExportResponse> {
  const res = await invokeAdminApi({
    action: 'audit_logs_export',
    format: body.format,
    filters: body.filters ?? {},
  })
  const inner = unwrapData(res as Record<string, unknown>)
  const url = isRecord(inner) && typeof inner.url === 'string' ? inner.url : ''
  return { url }
}
