/**
 * Admin platform API — calls `admin-api` Edge Function with session JWT; normalizes array fields.
 */
import { invokeAdminApi } from '@/lib/supabase-functions'
import type {
  AdminSystemHealth,
  AdminUsageMetrics,
  AdminUserExportBody,
  AdminUserExportResponse,
  AdminUserPatchBody,
  AdminUserRow,
  AdminUsersListResponse,
} from '@/types/admin'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

export function normalizeTrend(v: unknown): { date: string; count: number }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!isRecord(item)) return null
      const date = typeof item.date === 'string' ? item.date : ''
      const count = typeof item.count === 'number' && Number.isFinite(item.count) ? item.count : 0
      if (!date) return null
      return { date, count }
    })
    .filter((x): x is { date: string; count: number } => x !== null)
}

export function normalizeRecentActivity(v: unknown): AdminUsageMetrics['recentActivity'] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!isRecord(item)) return null
      const id = typeof item.id === 'string' ? item.id : ''
      if (!id) return null
      const adminId = typeof item.adminId === 'string' ? item.adminId : ''
      const action = typeof item.action === 'string' ? item.action : ''
      const targetUserId = typeof item.targetUserId === 'string' ? item.targetUserId : ''
      const timestamp = typeof item.timestamp === 'string' ? item.timestamp : ''
      const meta = item.metadata
      const metadata =
        meta && typeof meta === 'object' && !Array.isArray(meta)
          ? (meta as Record<string, unknown>)
          : {}
      return { id, adminId, action, targetUserId, timestamp, metadata }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

export function normalizeUsageMetrics(raw: unknown): AdminUsageMetrics {
  const r = isRecord(raw) ? raw : {}
  const num = (k: string, d = 0) => {
    const x = r[k]
    return typeof x === 'number' && Number.isFinite(x) ? x : d
  }
  const issues = normalizeStringArray(r.topIssues)
  return {
    activeCompanies: num('activeCompanies'),
    dailyReports: num('dailyReports'),
    weeklyReports: num('weeklyReports'),
    monthlyReports: num('monthlyReports'),
    uptimePct: num('uptimePct', 100),
    latencyMs: num('latencyMs'),
    errorRate: num('errorRate'),
    adminActions: num('adminActions'),
    topIssues: issues.length > 0 ? issues : ['No issues in the current audit window.'],
    queueDepth: num('queueDepth'),
    activeSessionsApprox: num('activeSessionsApprox'),
    companiesTrend: normalizeTrend(r.companiesTrend),
    reportsTrend: normalizeTrend(r.reportsTrend),
    recentActivity: normalizeRecentActivity(r.recentActivity),
  }
}

export function normalizeSystemHealth(raw: unknown): AdminSystemHealth {
  const r = isRecord(raw) ? raw : {}
  const statusRaw = r.status
  const status: AdminSystemHealth['status'] =
    statusRaw === 'yellow' || statusRaw === 'red' || statusRaw === 'green' ? statusRaw : 'yellow'
  const details = normalizeStringArray(r.details)
  return {
    status,
    details: details.length > 0 ? details : ['No health details returned.'],
  }
}

export function normalizeAdminUsersResponse(raw: unknown): AdminUsersListResponse {
  const r = isRecord(raw) ? raw : {}
  const dataRaw = r.data
  const list = Array.isArray(dataRaw) ? dataRaw : []
  const data: AdminUserRow[] = list.map((row) => parseAdminUserRow(row)).filter((x): x is AdminUserRow => x !== null)
  const totalRaw = r.total
  const total = typeof totalRaw === 'number' && Number.isFinite(totalRaw) ? totalRaw : data.length
  return { data, total }
}

function parseAdminUserRow(row: unknown): AdminUserRow | null {
  if (!isRecord(row)) return null
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  const email = typeof row.email === 'string' ? row.email : ''
  const name = typeof row.name === 'string' ? row.name : ''
  const role = typeof row.role === 'string' ? row.role : 'founder'
  const status = row.status === 'suspended' ? 'suspended' : 'active'
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : ''
  const lastLogin = typeof row.lastLogin === 'string' ? row.lastLogin : ''
  const pr = row.profile
  let avatarUrl: string | null = null
  if (pr && typeof pr === 'object' && !Array.isArray(pr) && typeof (pr as { avatarUrl?: unknown }).avatarUrl === 'string') {
    avatarUrl = (pr as { avatarUrl: string }).avatarUrl
  }
  return {
    id,
    email,
    name,
    role,
    status,
    createdAt,
    lastLogin,
    profile: { avatarUrl },
  }
}

export function normalizeAdminUserRow(raw: unknown): AdminUserRow {
  return (
    parseAdminUserRow(raw) ?? {
      id: '',
      email: '',
      name: '',
      role: 'founder',
      status: 'active',
      createdAt: '',
      lastLogin: '',
      profile: { avatarUrl: null },
    }
  )
}

function unwrapData(res: Record<string, unknown>): unknown {
  return isRecord(res.data) ? res.data : res
}

export async function fetchAdminUsageMetrics(): Promise<AdminUsageMetrics> {
  const res = await invokeAdminApi({ action: 'metrics_usage' })
  return normalizeUsageMetrics(unwrapData(res))
}

export async function fetchAdminSystemHealth(): Promise<AdminSystemHealth> {
  const res = await invokeAdminApi({ action: 'system_health' })
  return normalizeSystemHealth(unwrapData(res))
}

export async function fetchAdminUsers(params: {
  page: number
  pageSize: number
  role?: string
  status?: string
  search?: string
}): Promise<AdminUsersListResponse> {
  const res = await invokeAdminApi({
    action: 'users_list',
    page: params.page,
    pageSize: params.pageSize,
    role: params.role ?? 'all',
    status: params.status ?? 'all',
    search: params.search ?? '',
  })
  return normalizeAdminUsersResponse(unwrapData(res))
}

export async function patchAdminUser(body: AdminUserPatchBody): Promise<AdminUserRow> {
  const res = await invokeAdminApi({
    action: 'users_patch',
    userId: body.userId,
    role: body.role,
    status: body.status,
  })
  return normalizeAdminUserRow(unwrapData(res))
}

export async function exportAdminUsers(body: AdminUserExportBody): Promise<AdminUserExportResponse> {
  const res = await invokeAdminApi({
    action: 'users_export',
    format: body.format,
    filters: body.filters ?? {},
  })
  const inner = unwrapData(res)
  const url = isRecord(inner) && typeof inner.url === 'string' ? inner.url : ''
  return { url }
}
