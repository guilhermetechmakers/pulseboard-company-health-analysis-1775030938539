/**
 * Admin platform API — calls `admin-api` Edge Function with session JWT; normalizes array fields.
 */
import { invokeAdminApi, invokePulseCompaniesApi } from '@/lib/supabase-functions'
import type {
  AdminCompanyPicklistItem,
  AdminUserDetailCompany,
  AdminExportJobStartResponse,
  AdminExportJobStatusResponse,
  AdminImpersonateResponse,
  AdminSystemHealth,
  AdminUsageMetrics,
  AdminUserDetailResponse,
  AdminUserExportBody,
  AdminUserExportResponse,
  AdminUserManagementStats,
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
  let list: unknown[] = []
  let totalRaw: unknown = r.total

  const dataRaw = r.data
  if (Array.isArray(dataRaw)) {
    list = dataRaw
  } else if (isRecord(dataRaw) && Array.isArray(dataRaw.data)) {
    list = dataRaw.data
    totalRaw = dataRaw.total ?? r.total
  }

  const data: AdminUserRow[] = list.map((row) => parseAdminUserRow(row)).filter((x): x is AdminUserRow => x !== null)
  const total = typeof totalRaw === 'number' && Number.isFinite(totalRaw) ? totalRaw : data.length
  return { data, total }
}

export function normalizeUserManagementStats(raw: unknown): AdminUserManagementStats {
  const r = isRecord(raw) ? raw : {}
  const num = (k: string, d = 0) => {
    const x = r[k]
    return typeof x === 'number' && Number.isFinite(x) ? x : d
  }
  const rdRaw = r.roleDistribution
  const roleDistribution = Array.isArray(rdRaw)
    ? rdRaw
        .map((item) => {
          const o = isRecord(item) ? item : {}
          const role = typeof o.role === 'string' ? o.role : ''
          const count = typeof o.count === 'number' && Number.isFinite(o.count) ? o.count : 0
          if (!role) return null
          return { role, count }
        })
        .filter((x): x is { role: string; count: number } => x !== null)
    : []
  const stRaw = r.suspensionTrend
  const suspensionTrend = Array.isArray(stRaw)
    ? stRaw
        .map((item) => {
          const o = isRecord(item) ? item : {}
          const date = typeof o.date === 'string' ? o.date : ''
          const count = typeof o.count === 'number' && Number.isFinite(o.count) ? o.count : 0
          if (!date) return null
          return { date, count }
        })
        .filter((x): x is { date: string; count: number } => x !== null)
    : []
  return {
    totalUsers: num('totalUsers'),
    activeUsers: num('activeUsers'),
    suspendedUsers: num('suspendedUsers'),
    roleDistribution,
    suspensionTrend,
  }
}

export async function fetchUserManagementStats(): Promise<AdminUserManagementStats> {
  const res = await invokeAdminApi({ action: 'user_management_stats' })
  return normalizeUserManagementStats(unwrapData(res))
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
  const lastActiveAt = typeof row.lastActiveAt === 'string' ? row.lastActiveAt : lastLogin
  const rolesRaw = row.roles
  const rolesParsed = Array.isArray(rolesRaw) ? rolesRaw.filter((x): x is string => typeof x === 'string') : []
  const roles = rolesParsed.length > 0 ? rolesParsed : [role]
  const lcRaw = row.linkedCompanies
  const linkedCompanies = Array.isArray(lcRaw) ? lcRaw.filter((x): x is string => typeof x === 'string') : []
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
    roles,
    status,
    createdAt,
    lastLogin,
    lastActiveAt,
    linkedCompanies,
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
      roles: ['founder'],
      status: 'active',
      createdAt: '',
      lastLogin: '',
      lastActiveAt: '',
      linkedCompanies: [],
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
  createdFrom?: string
  createdTo?: string
  companyId?: string
}): Promise<AdminUsersListResponse> {
  const res = await invokeAdminApi({
    action: 'users_list',
    page: params.page,
    pageSize: params.pageSize,
    role: params.role ?? 'all',
    status: params.status ?? 'all',
    search: params.search ?? '',
    createdFrom: params.createdFrom ?? '',
    createdTo: params.createdTo ?? '',
    companyId: params.companyId ?? '',
  })
  return normalizeAdminUsersResponse(unwrapData(res))
}

export function normalizeAdminUserDetail(raw: unknown): AdminUserDetailResponse | null {
  const r = isRecord(raw) ? raw : {}
  const uRaw = r.user
  if (!isRecord(uRaw)) return null
  const id = typeof uRaw.id === 'string' ? uRaw.id : ''
  if (!id) return null
  const email = typeof uRaw.email === 'string' ? uRaw.email : ''
  const name = typeof uRaw.name === 'string' ? uRaw.name : ''
  const role = typeof uRaw.role === 'string' ? uRaw.role : 'founder'
  const rolesRaw = uRaw.roles
  const roles = Array.isArray(rolesRaw) ? rolesRaw.filter((x): x is string => typeof x === 'string') : [role]
  const status = uRaw.status === 'suspended' ? 'suspended' : 'active'
  const createdAt = typeof uRaw.createdAt === 'string' ? uRaw.createdAt : ''
  const lastLogin = typeof uRaw.lastLogin === 'string' ? uRaw.lastLogin : ''
  const lcRaw = uRaw.linkedCompanies
  const linkedCompanies: AdminUserDetailCompany[] = Array.isArray(lcRaw)
    ? lcRaw.flatMap((c) => {
        const o = isRecord(c) ? c : {}
        const cid = typeof o.id === 'string' ? o.id : ''
        if (!cid) return []
        const cname = typeof o.name === 'string' ? o.name : ''
        const via: 'owner' | 'member' = o.via === 'member' ? 'member' : 'owner'
        const memRole = typeof o.role === 'string' ? o.role : undefined
        const base: AdminUserDetailCompany = { id: cid, name: cname || cid, via }
        return [memRole !== undefined ? { ...base, role: memRole } : base]
      })
    : []
  const actRaw = r.activity
  const activity = Array.isArray(actRaw)
    ? actRaw
        .map((a) => {
          const o = isRecord(a) ? a : {}
          const aid = typeof o.id === 'string' ? o.id : String(o.id ?? '')
          const action = typeof o.action === 'string' ? o.action : ''
          const createdAt = typeof o.createdAt === 'string' ? o.createdAt : ''
          const meta = o.metadata
          const metadata =
            meta !== null && typeof meta === 'object' && !Array.isArray(meta)
              ? (meta as Record<string, unknown>)
              : {}
          return { id: aid, action, metadata, createdAt }
        })
        .filter((x) => x.id.length > 0)
    : []
  return {
    user: {
      id,
      email,
      name,
      role,
      roles,
      status,
      createdAt,
      lastLogin,
      linkedCompanies,
    },
    activity,
  }
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetailResponse | null> {
  const res = await invokeAdminApi({ action: 'users_get', userId })
  return normalizeAdminUserDetail(unwrapData(res))
}

export async function impersonateAdminUser(input: {
  userId: string
  auditReason?: string
}): Promise<AdminImpersonateResponse> {
  const res = await invokeAdminApi({
    action: 'users_impersonate',
    userId: input.userId,
    auditReason: input.auditReason ?? '',
  })
  const inner = unwrapData(res)
  if (!isRecord(inner)) {
    return {
      impersonationToken: '',
      magicLink: '',
      expiresAt: '',
      targetUserId: input.userId,
      message: '',
    }
  }
  return {
    impersonationToken: typeof inner.impersonationToken === 'string' ? inner.impersonationToken : '',
    magicLink: typeof inner.magicLink === 'string' ? inner.magicLink : '',
    expiresAt: typeof inner.expiresAt === 'string' ? inner.expiresAt : '',
    targetUserId: typeof inner.targetUserId === 'string' ? inner.targetUserId : input.userId,
    message: typeof inner.message === 'string' ? inner.message : '',
  }
}

export async function fetchAdminCompaniesPicklist(): Promise<AdminCompanyPicklistItem[]> {
  const res = await invokeAdminApi({ action: 'companies_picklist' })
  const inner = unwrapData(res)
  const list = inner && isRecord(inner) ? inner.companies : []
  if (!Array.isArray(list)) return []
  return list
    .map((c) => {
      const o = isRecord(c) ? c : {}
      return {
        id: typeof o.id === 'string' ? o.id : '',
        name: typeof o.name === 'string' ? o.name : '',
      }
    })
    .filter((x) => x.id.length > 0)
}

export async function startAdminUsersExportJob(body: AdminUserExportBody): Promise<AdminExportJobStartResponse> {
  const f = body.filters ?? {}
  const res = await invokeAdminApi({
    action: 'users_export_job',
    format: body.format,
    scope: body.scope ?? 'filtered',
    filters: {
      role: f.role,
      status: f.status,
      createdFrom: f.createdFrom ?? f.createdAtRange?.from,
      createdTo: f.createdTo ?? f.createdAtRange?.to,
      companyId: f.companyId,
    },
  })
  const inner = unwrapData(res)
  const jobId = isRecord(inner) && typeof inner.jobId === 'string' ? inner.jobId : ''
  return { jobId }
}

export async function fetchAdminUsersExportJobStatus(jobId: string): Promise<AdminExportJobStatusResponse> {
  const res = await invokeAdminApi({ action: 'users_export_job_status', jobId })
  const inner = unwrapData(res)
  if (!isRecord(inner)) {
    return { status: 'pending' }
  }
  const st = typeof inner.status === 'string' ? inner.status : 'pending'
  if (st === 'completed') {
    const downloadUrl = typeof inner.downloadUrl === 'string' ? inner.downloadUrl : ''
    return { status: 'completed', downloadUrl }
  }
  if (st === 'failed') {
    const errorMessage = typeof inner.errorMessage === 'string' ? inner.errorMessage : 'Export failed'
    return { status: 'failed', errorMessage }
  }
  if (st === 'processing') return { status: 'processing' }
  return { status: 'pending' }
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
  const f = body.filters ?? {}
  const res = await invokeAdminApi({
    action: 'users_export',
    format: body.format,
    filters: {
      role: f.role,
      status: f.status,
      createdFrom: f.createdFrom ?? f.createdAtRange?.from,
      createdTo: f.createdTo ?? f.createdAtRange?.to,
      companyId: f.companyId,
      scope: body.scope === 'full' ? 'full' : 'filtered',
    },
  })
  const inner = unwrapData(res)
  const url = isRecord(inner) && typeof inner.url === 'string' ? inner.url : ''
  return { url }
}

export type AdminMultiCompanyUser = {
  userId: string
  companyCount: number
  companyIds: string[]
}

export async function fetchAdminMultiCompanyUsers(): Promise<AdminMultiCompanyUser[]> {
  const res = await invokeAdminApi({ action: 'companies_multi_list' })
  const inner = unwrapData(res)
  const usersRaw = inner && isRecord(inner) ? inner.users : []
  if (!Array.isArray(usersRaw)) return []
  return usersRaw
    .map((u) => {
      const r = isRecord(u) ? u : {}
      return {
        userId: typeof r.userId === 'string' ? r.userId : '',
        companyCount: typeof r.companyCount === 'number' ? r.companyCount : 0,
        companyIds: Array.isArray(r.companyIds) ? r.companyIds.filter((x): x is string => typeof x === 'string') : [],
      }
    })
    .filter((x) => x.userId.length > 0)
}

export async function runAdminCompaniesMigrateDryRun(): Promise<unknown> {
  const res = await invokeAdminApi({ action: 'companies_migrate_dry_run' })
  return unwrapData(res)
}

export async function mergeAdminCompanies(input: {
  sourceCompanyId: string
  targetCompanyId: string
  dryRun?: boolean
}): Promise<unknown> {
  const res = await invokeAdminApi({
    action: 'companies_merge',
    sourceCompanyId: input.sourceCompanyId,
    targetCompanyId: input.targetCompanyId,
    dryRun: input.dryRun ?? false,
  })
  return unwrapData(res)
}

export type AdminTelemetryEventRow = {
  id: string
  user_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

/** Product analytics surface: `GET /api/telemetry/events` equivalent via `pulse-companies-api`. */
export async function fetchAdminTelemetryEvents(limit = 80): Promise<AdminTelemetryEventRow[]> {
  const raw = await invokePulseCompaniesApi<{ data: { events: Record<string, unknown>[] } }>({
    op: 'telemetry_list',
    limit,
  })
  const events = raw?.data?.events
  if (!Array.isArray(events)) return []
  return events.map((e) => {
    const r = isRecord(e) ? e : {}
    const p = r.payload
    return {
      id: typeof r.id === 'string' ? r.id : String(r.id ?? ''),
      user_id: typeof r.user_id === 'string' ? r.user_id : '',
      event_type: typeof r.event_type === 'string' ? r.event_type : '',
      payload: p !== null && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {},
      created_at: typeof r.created_at === 'string' ? r.created_at : '',
    }
  })
}
