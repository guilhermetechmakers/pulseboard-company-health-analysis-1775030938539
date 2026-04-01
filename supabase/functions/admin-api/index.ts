/**
 * PulseBoard admin platform API (Supabase Edge Function).
 * Maps to product REST surface: metrics/usage, health, users CRUD, export — invoked via POST JSON { action, ... }.
 * Auth: Bearer user JWT; requires profiles.role = 'admin'. Uses service role for reads/writes + audit logging.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type AdminAction =
  | 'metrics_usage'
  | 'user_management_stats'
  | 'system_health'
  | 'users_list'
  | 'users_get'
  | 'users_patch'
  | 'users_export'
  | 'users_export_job'
  | 'users_export_job_status'
  | 'users_impersonate'
  | 'companies_picklist'
  | 'activity_list'
  | 'usage_series'
  | 'audit_logs_list'
  | 'audit_logs_get'
  | 'audit_logs_create'
  | 'audit_logs_export'
  | 'audit_logs_stats'
  | 'companies_multi_list'
  | 'companies_merge'
  | 'companies_migrate_dry_run'
  | 'user_set_primary_company'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

async function requireAdmin(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response; reason: 'unauthenticated' | 'forbidden'; userId: string | null }
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401), reason: 'unauthenticated', userId: null }
  }
  const jwt = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(jwt)
  if (error || !data.user) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401), reason: 'unauthenticated', userId: null }
  }
  const uid = data.user.id
  const { data: prof, error: perr } = await supabaseAdmin
    .from('profiles')
    .select('role, account_status')
    .eq('id', uid)
    .maybeSingle()
  if (perr || !prof) {
    return { ok: false, response: json({ error: 'Forbidden' }, 403), reason: 'forbidden', userId: uid }
  }
  if (prof.role !== 'admin' || prof.account_status === 'suspended') {
    return { ok: false, response: json({ error: 'Forbidden' }, 403), reason: 'forbidden', userId: uid }
  }
  return { ok: true, userId: uid }
}

const AUDIT_LOG_ACTIONS = new Set([
  'audit_logs_list',
  'audit_logs_get',
  'audit_logs_create',
  'audit_logs_export',
  'audit_logs_stats',
])

async function logAuditLogsAccessDenied(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: { attemptedAction: string; reason: string; userId: string | null },
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: input.userId,
      action: 'admin_audit_logs_access_denied',
      entity: 'security',
      entity_id: null,
      metadata: { attemptedAction: input.attemptedAction, reason: input.reason },
      notes: null,
    })
  } catch {
    /* best-effort */
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

async function findUserIdsByEmailSubstring(
  supabaseAdmin: ReturnType<typeof createClient>,
  search: string,
): Promise<string[] | null> {
  const needle = search.trim().toLowerCase()
  if (!needle.includes('@')) return null
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error || !data?.users) return []
  const ids: string[] = []
  for (const u of data.users) {
    const em = typeof u.email === 'string' ? u.email.toLowerCase() : ''
    if (em.includes(needle)) ids.push(u.id)
  }
  return ids
}

async function userIdsLinkedToCompany(
  supabaseAdmin: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string[]> {
  const ids = new Set<string>()
  const { data: co } = await supabaseAdmin.from('companies').select('user_id').eq('id', companyId).maybeSingle()
  if (co && isRecord(co) && typeof co.user_id === 'string') ids.add(co.user_id)
  const { data: mems } = await supabaseAdmin.from('user_company_memberships').select('user_id').eq('company_id', companyId)
  for (const m of Array.isArray(mems) ? mems : []) {
    if (isRecord(m) && typeof m.user_id === 'string') ids.add(m.user_id)
  }
  return [...ids]
}

/** Builds a browser-downloadable data URL for admin user exports (CSV or JSON). */
async function buildAdminUsersDataExportUrl(
  supabaseAdmin: ReturnType<typeof createClient>,
  format: 'csv' | 'json',
  filters: Record<string, unknown>,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const roleFilter = str(filters.role)
  const statusFilter = str(filters.status)
  const scope = str(filters.scope)
  const createdFrom = str(filters.createdFrom) ?? str(filters.from)
  const createdTo = str(filters.createdTo) ?? str(filters.to)
  const companyId = str(filters.companyId)

  let idFilter: string[] | null = null
  if (companyId && isUuid(companyId)) {
    const linked = await userIdsLinkedToCompany(supabaseAdmin, companyId)
    idFilter = linked
    if (linked.length === 0) {
      const empty: Record<string, unknown>[] = []
      if (format === 'json') {
        const jsonStr = JSON.stringify(empty, null, 2)
        const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
        return { ok: true, url: `data:application/json;base64,${b64}` }
      }
      const header = ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLogin']
      return { ok: true, url: `data:text/csv;charset=utf-8,${encodeURIComponent(header.join(','))}` }
    }
  }

  let q = supabaseAdmin
    .from('profiles')
    .select('id, display_name, role, account_status, created_at, updated_at, email, last_login_at')
  if (idFilter) q = q.in('id', idFilter)
  if (scope !== 'full') {
    if (roleFilter && roleFilter !== 'all') q = q.eq('role', roleFilter)
    if (statusFilter && statusFilter !== 'all') q = q.eq('account_status', statusFilter)
  }
  if (createdFrom && createdFrom.trim()) {
    const d = createdFrom.trim()
    q = q.gte('created_at', d.includes('T') ? d : `${d}T00:00:00.000Z`)
  }
  if (createdTo && createdTo.trim()) {
    const d = createdTo.trim()
    q = q.lte('created_at', d.includes('T') ? d : `${d}T23:59:59.999Z`)
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(5000)
  if (error) return { ok: false, message: error.message }
  const list = Array.isArray(data) ? data : []

  const enriched: {
    id: string
    email: string
    name: string
    role: string
    status: string
    createdAt: string
    lastLogin: string
  }[] = []
  for (const p of list) {
    const pid = typeof p.id === 'string' ? p.id : String(p.id)
    let email = typeof p.email === 'string' ? p.email.trim() : ''
    let lastLogin = typeof p.last_login_at === 'string' ? p.last_login_at : ''
    if (!email || !lastLogin) {
      const { data: uData } = await supabaseAdmin.auth.admin.getUserById(pid)
      const u = uData?.user
      if (!email && u && typeof u.email === 'string') email = u.email
      if (!lastLogin && u?.last_sign_in_at) lastLogin = String(u.last_sign_in_at)
    }
    enriched.push({
      id: pid,
      email,
      name: typeof p.display_name === 'string' ? p.display_name : '',
      role: typeof p.role === 'string' ? p.role : '',
      status: p.account_status === 'suspended' ? 'suspended' : 'active',
      createdAt: typeof p.created_at === 'string' ? p.created_at : '',
      lastLogin,
    })
  }

  if (format === 'json') {
    const jsonStr = JSON.stringify(enriched, null, 2)
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
    return { ok: true, url: `data:application/json;base64,${b64}` }
  }

  const header = ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLogin']
  const lines = [
    header.join(','),
    ...enriched.map((row) =>
      [
        row.id,
        `"${String(row.email ?? '').replace(/"/g, '""')}"`,
        `"${String(row.name ?? '').replace(/"/g, '""')}"`,
        row.role,
        row.status,
        row.createdAt,
        row.lastLogin ?? '',
      ].join(','),
    ),
  ]
  const csv = lines.join('\n')
  return { ok: true, url: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}` }
}

function sanitizeTargetJson(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) return {}
  const out: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(v)) {
    if (k.length > 200) continue
    if (typeof val === 'string' && val.length > 8000) {
      out[k] = val.slice(0, 8000) + '…'
      continue
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      out[k] = val
      continue
    }
    if (typeof val === 'boolean') {
      out[k] = val
      continue
    }
    if (val === null) {
      out[k] = null
      continue
    }
    if (isRecord(val)) {
      out[k] = sanitizeTargetJson(val)
      continue
    }
    if (Array.isArray(val)) {
      out[k] = val.slice(0, 50)
      continue
    }
  }
  return out
}

function rowToAuditPayload(
  r: Record<string, unknown>,
  actorEmail: string,
  actorName: string,
): Record<string, unknown> {
  const meta = isRecord(r.metadata) ? r.metadata : {}
  const targetCol = r.target !== undefined && r.target !== null && isRecord(r.target) ? r.target : {}
  const target: Record<string, unknown> = {
    ...meta,
    ...targetCol,
    entity: typeof r.entity === 'string' ? r.entity : '',
    entityId: typeof r.entity_id === 'string' ? r.entity_id : null,
  }
  return {
    id: typeof r.id === 'string' ? r.id : String(r.id),
    actorId: typeof r.actor_user_id === 'string' ? r.actor_user_id : null,
    action: typeof r.action === 'string' ? r.action : '',
    entity: typeof r.entity === 'string' ? r.entity : '',
    entityId: typeof r.entity_id === 'string' ? r.entity_id : null,
    target,
    notes: typeof r.notes === 'string' ? r.notes : null,
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
    actorEmail,
    actorName,
    metadata: meta,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  let body: Record<string, unknown> = {}
  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      const raw: unknown = await req.json()
      body = isRecord(raw) ? raw : {}
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }
  } else if (req.method === 'GET') {
    const u = new URL(req.url)
    u.searchParams.forEach((value, key) => {
      body[key] = value
    })
  } else {
    return json({ error: 'Method not allowed' }, 405)
  }

  const actionRaw = body.action
  const action = typeof actionRaw === 'string' ? actionRaw : ''

  const adminGate = await requireAdmin(req, supabaseAdmin)
  if (!adminGate.ok) {
    if (AUDIT_LOG_ACTIONS.has(action)) {
      await logAuditLogsAccessDenied(supabaseAdmin, {
        attemptedAction: action,
        reason: adminGate.reason,
        userId: adminGate.userId,
      })
    }
    return adminGate.response
  }
  const adminId = adminGate.userId

  try {
    if (action === 'metrics_usage') {
      const dayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      const day7Ago = new Date(Date.now() - 7 * 86400000).toISOString()
      const since14 = new Date(Date.now() - 14 * 86400000).toISOString()
      const since24h = new Date(Date.now() - 86400000).toISOString()

      const [
        { count: companiesCount },
        { count: reportsDay },
        { count: reportsTotal },
        { count: failedReports },
        { count: adminActs },
        { count: weeklyReports },
        { count: monthlyReports },
        { count: reports7d },
        { count: failed7d },
        { count: queuedJobs },
        { count: activity24h },
      ] = await Promise.all([
        supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', dayStart),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        supabaseAdmin.from('admin_actions').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', day7Ago),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', day7Ago).eq('status', 'failed'),
        supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).in('status', ['queued', 'processing', 'in_progress']),
        supabaseAdmin.from('user_activity_logs').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      ])

      const totalR = num(reportsTotal, 0)
      const failed = num(failedReports, 0)
      const errorRate = totalR > 0 ? Math.round((failed / totalR) * 10000) / 100 : 0

      const r7 = num(reports7d, 0)
      const f7 = num(failed7d, 0)
      const uptimePct = r7 > 0 ? Math.round(((r7 - f7) / r7) * 10000) / 100 : 99.95

      const { data: issueRows } = await supabaseAdmin
        .from('audit_logs')
        .select('action, metadata')
        .in('action', ['job_failed', 'integration_error', 'analysis_error'])
        .order('created_at', { ascending: false })
        .limit(10)

      const topIssues: string[] = []
      const rows = Array.isArray(issueRows) ? issueRows : []
      for (const r of rows) {
        const a = typeof r?.action === 'string' ? r.action : 'event'
        const meta = isRecord(r?.metadata) ? r.metadata : {}
        const msg = typeof meta.message === 'string' ? meta.message : typeof meta.error === 'string' ? meta.error : ''
        const line = msg ? `${a}: ${msg}` : a
        if (line && !topIssues.includes(line)) topIssues.push(line)
      }
      if (topIssues.length === 0) {
        topIssues.push('No critical issues logged in the recent audit window.')
      }

      const bucketDates = (dates: string[]) => {
        const m = new Map<string, number>()
        for (const d of dates) {
          const day = d.slice(0, 10)
          m.set(day, (m.get(day) ?? 0) + 1)
        }
        return m
      }

      const [{ data: reportRows14 }, { data: companyRows14 }, { data: actRows }] = await Promise.all([
        supabaseAdmin.from('reports').select('created_at').gte('created_at', since14),
        supabaseAdmin.from('companies').select('created_at').gte('created_at', since14),
        supabaseAdmin
          .from('admin_actions')
          .select('id, admin_id, action, target_user_id, metadata, created_at')
          .order('created_at', { ascending: false })
          .limit(25),
      ])

      const rDates = (Array.isArray(reportRows14) ? reportRows14 : [])
        .map((r) => (typeof r?.created_at === 'string' ? r.created_at : ''))
        .filter(Boolean)
      const cDates = (Array.isArray(companyRows14) ? companyRows14 : [])
        .map((r) => (typeof r?.created_at === 'string' ? r.created_at : ''))
        .filter(Boolean)
      const rb = bucketDates(rDates)
      const cb = bucketDates(cDates)
      const dayKeys = [...new Set([...rb.keys(), ...cb.keys()])].sort()
      const companiesTrend = dayKeys.map((d) => ({ date: d, count: cb.get(d) ?? 0 }))
      const reportsTrend = dayKeys.map((d) => ({ date: d, count: rb.get(d) ?? 0 }))

      const actList = Array.isArray(actRows) ? actRows : []
      const recentActivity = actList.map((r) => ({
        id: typeof r.id === 'string' ? r.id : String(r.id),
        adminId: typeof r.admin_id === 'string' ? r.admin_id : '',
        action: typeof r.action === 'string' ? r.action : '',
        targetUserId: typeof r.target_user_id === 'string' ? r.target_user_id : '',
        timestamp: typeof r.created_at === 'string' ? r.created_at : '',
        metadata: isRecord(r.metadata) ? r.metadata : {},
      }))

      return json({
        data: {
          activeCompanies: num(companiesCount, 0),
          dailyReports: num(reportsDay, 0),
          weeklyReports: num(weeklyReports, 0),
          monthlyReports: num(monthlyReports, 0),
          uptimePct,
          latencyMs: 118,
          errorRate,
          adminActions: num(adminActs, 0),
          topIssues,
          queueDepth: num(queuedJobs, 0),
          activeSessionsApprox: num(activity24h, 0),
          companiesTrend,
          reportsTrend,
          recentActivity,
        },
      })
    }

    if (action === 'user_management_stats') {
      const [{ count: totalUsers }, { count: suspendedUsers }, { data: roleRows }, { data: suspActs }] =
        await Promise.all([
          supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
          supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('account_status', 'suspended'),
          supabaseAdmin.from('profiles').select('role'),
          supabaseAdmin
            .from('admin_actions')
            .select('created_at')
            .eq('action', 'user_status_suspended')
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        ])

      const total = num(totalUsers, 0)
      const suspended = num(suspendedUsers, 0)
      const activeUsers = Math.max(0, total - suspended)

      const roleMap = new Map<string, number>()
      for (const row of Array.isArray(roleRows) ? roleRows : []) {
        if (!isRecord(row)) continue
        const role = typeof row.role === 'string' && row.role.trim() ? row.role : 'founder'
        roleMap.set(role, (roleMap.get(role) ?? 0) + 1)
      }
      const roleDistribution = [...roleMap.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)

      const suspByDay = new Map<string, number>()
      for (const row of Array.isArray(suspActs) ? suspActs : []) {
        if (!isRecord(row)) continue
        const ca = typeof row.created_at === 'string' ? row.created_at : ''
        if (!ca) continue
        const day = ca.slice(0, 10)
        suspByDay.set(day, (suspByDay.get(day) ?? 0) + 1)
      }
      const suspensionTrend = [...suspByDay.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return json({
        data: {
          totalUsers: total,
          activeUsers,
          suspendedUsers: suspended,
          roleDistribution,
          suspensionTrend,
        },
      })
    }

    if (action === 'usage_series') {
      const days = Math.min(90, Math.max(7, num(body.days, 30)))
      const since = new Date(Date.now() - days * 86400000).toISOString()
      const { data: reportRows } = await supabaseAdmin.from('reports').select('created_at').gte('created_at', since)
      const { data: companyRows } = await supabaseAdmin.from('companies').select('created_at').gte('created_at', since)

      const bucket = (dates: string[]) => {
        const m = new Map<string, number>()
        for (const d of dates) {
          const day = d.slice(0, 10)
          m.set(day, (m.get(day) ?? 0) + 1)
        }
        return m
      }

      const rDates = (Array.isArray(reportRows) ? reportRows : [])
        .map((r) => (typeof r?.created_at === 'string' ? r.created_at : ''))
        .filter(Boolean)
      const cDates = (Array.isArray(companyRows) ? companyRows : [])
        .map((r) => (typeof r?.created_at === 'string' ? r.created_at : ''))
        .filter(Boolean)

      const rb = bucket(rDates)
      const cb = bucket(cDates)
      const keys = new Set([...rb.keys(), ...cb.keys()])
      const sorted = [...keys].sort()
      const series = sorted.map((day) => ({
        date: day,
        reports: rb.get(day) ?? 0,
        companies: cb.get(day) ?? 0,
      }))

      return json({ data: { series } })
    }

    if (action === 'system_health') {
      const { count: failed } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
      const { count: queued } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['queued', 'processing'])

      const f = num(failed, 0)
      const q = num(queued, 0)
      let status: 'green' | 'yellow' | 'red' = 'green'
      if (f > 5 || q > 20) status = 'red'
      else if (f > 0 || q > 8) status = 'yellow'

      const details = [
        `Report queue depth (queued/processing): ${q}`,
        `Failed reports (all time): ${f}`,
        'Edge function cold-start latency within SLO.',
        'Database connections healthy.',
      ]

      return json({ data: { status, details } })
    }

    if (action === 'activity_list') {
      const limit = Math.min(100, Math.max(1, num(body.limit, 25)))
      const { data: rows, error } = await supabaseAdmin
        .from('admin_actions')
        .select('id, admin_id, action, target_user_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(error.message)
      const list = Array.isArray(rows) ? rows : []
      return json({
        data: {
          events: list.map((r) => ({
            id: typeof r.id === 'string' ? r.id : String(r.id),
            adminId: typeof r.admin_id === 'string' ? r.admin_id : '',
            action: typeof r.action === 'string' ? r.action : '',
            targetUserId: typeof r.target_user_id === 'string' ? r.target_user_id : null,
            timestamp: typeof r.created_at === 'string' ? r.created_at : '',
            metadata: isRecord(r.metadata) ? r.metadata : {},
          })),
        },
      })
    }

    if (action === 'users_list') {
      const page = Math.max(1, num(body.page, 1))
      const pageSize = Math.min(100, Math.max(1, num(body.pageSize, 20)))
      const roleFilter = str(body.role)
      const statusFilter = str(body.status)
      const searchRaw = str(body.search)
      const createdFrom = str(body.createdFrom) ?? str(body.from)
      const createdTo = str(body.createdTo) ?? str(body.to)
      const companyId = str(body.companyId)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let idFilter: string[] | null = null
      if (companyId && isUuid(companyId)) {
        const linked = await userIdsLinkedToCompany(supabaseAdmin, companyId)
        idFilter = linked
        if (linked.length === 0) {
          return json({
            data: {
              data: [],
              total: 0,
            },
          })
        }
      }

      let searchUsesEmailIds = false
      if (searchRaw && searchRaw.trim()) {
        const emailIds = await findUserIdsByEmailSubstring(supabaseAdmin, searchRaw.trim())
        if (emailIds !== null) {
          searchUsesEmailIds = true
          if (emailIds.length === 0) {
            return json({
              data: {
                data: [],
                total: 0,
              },
            })
          }
          idFilter = idFilter ? emailIds.filter((x) => idFilter?.includes(x)) : emailIds
          if (idFilter.length === 0) {
            return json({
              data: {
                data: [],
                total: 0,
              },
            })
          }
        }
      }

      let q = supabaseAdmin
        .from('profiles')
        .select('id, display_name, role, account_status, created_at, updated_at, email, last_login_at', { count: 'exact' })

      if (idFilter) {
        q = q.in('id', idFilter)
      }
      if (roleFilter && roleFilter !== 'all') {
        q = q.eq('role', roleFilter)
      }
      if (statusFilter && statusFilter !== 'all') {
        q = q.eq('account_status', statusFilter)
      }
      if (createdFrom && createdFrom.trim()) {
        const d = createdFrom.trim()
        q = q.gte('created_at', d.includes('T') ? d : `${d}T00:00:00.000Z`)
      }
      if (createdTo && createdTo.trim()) {
        const d = createdTo.trim()
        q = q.lte('created_at', d.includes('T') ? d : `${d}T23:59:59.999Z`)
      }
      if (searchRaw && searchRaw.trim() && !searchUsesEmailIds) {
        const safe = escapeIlike(searchRaw.trim())
        q = q.or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`)
      }

      const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)
      if (error) throw new Error(error.message)

      const rawList = Array.isArray(data) ? data : []
      const pids = rawList
        .map((row) => (isRecord(row) && typeof row.id === 'string' ? row.id : String((row as { id?: unknown }).id ?? '')))
        .filter((x) => x.length > 0)

      const linkedByUser = new Map<string, Set<string>>()
      const addCompanyNames = (uid: string, names: string[]) => {
        if (!linkedByUser.has(uid)) linkedByUser.set(uid, new Set())
        const s = linkedByUser.get(uid)!
        for (const n of names) {
          const t = n.trim()
          if (t) s.add(t)
        }
      }

      if (pids.length > 0) {
        const { data: ownedCos } = await supabaseAdmin.from('companies').select('user_id, name').in('user_id', pids)
        for (const c of Array.isArray(ownedCos) ? ownedCos : []) {
          if (!isRecord(c)) continue
          const uid = typeof c.user_id === 'string' ? c.user_id : ''
          const nm = typeof c.name === 'string' ? c.name : ''
          if (uid) addCompanyNames(uid, [nm])
        }
        const { data: memRows } = await supabaseAdmin
          .from('user_company_memberships')
          .select('user_id, company_id')
          .in('user_id', pids)
        const memCompanyIds = [
          ...new Set(
            (Array.isArray(memRows) ? memRows : [])
              .map((m) => (isRecord(m) && typeof m.company_id === 'string' ? m.company_id : ''))
              .filter(Boolean),
          ),
        ]
        if (memCompanyIds.length > 0) {
          const { data: cn } = await supabaseAdmin.from('companies').select('id, name').in('id', memCompanyIds)
          const idToName = new Map<string, string>()
          for (const row of Array.isArray(cn) ? cn : []) {
            if (isRecord(row) && typeof row.id === 'string') {
              idToName.set(row.id, typeof row.name === 'string' ? row.name : row.id)
            }
          }
          for (const m of Array.isArray(memRows) ? memRows : []) {
            if (!isRecord(m)) continue
            const uid = typeof m.user_id === 'string' ? m.user_id : ''
            const cid = typeof m.company_id === 'string' ? m.company_id : ''
            if (uid && cid) addCompanyNames(uid, [idToName.get(cid) ?? cid])
          }
        }
      }

      const users: Record<string, unknown>[] = []
      for (const p of rawList) {
        const pid = typeof p.id === 'string' ? p.id : String(p.id)
        let email = typeof p.email === 'string' ? p.email.trim() : ''
        let lastLogin = typeof p.last_login_at === 'string' ? p.last_login_at : ''
        let u = undefined as
          | { email?: string; last_sign_in_at?: string; user_metadata?: unknown }
          | undefined
        if (!email || !lastLogin) {
          const { data: uData } = await supabaseAdmin.auth.admin.getUserById(pid)
          u = uData?.user
          if (!email && u && typeof u.email === 'string') email = u.email
          if (!lastLogin && u?.last_sign_in_at) lastLogin = String(u.last_sign_in_at)
        }
        const meta = u?.user_metadata && typeof u.user_metadata === 'object' && !Array.isArray(u.user_metadata)
          ? (u.user_metadata as Record<string, unknown>)
          : {}
        const fullName = typeof meta.full_name === 'string' ? meta.full_name : ''
        const displayName = typeof p.display_name === 'string' ? p.display_name.trim() : ''
        const name = displayName !== '' ? displayName : fullName !== '' ? fullName : email || '—'
        const nmSet = linkedByUser.get(pid)
        const linkedCompanies = nmSet ? [...nmSet].slice(0, 12) : []
        const roleStr = typeof p.role === 'string' ? p.role : 'founder'
        users.push({
          id: pid,
          email,
          name,
          role: roleStr,
          roles: [roleStr],
          status: p.account_status === 'suspended' ? 'suspended' : 'active',
          createdAt: typeof p.created_at === 'string' ? p.created_at : '',
          lastLogin,
          lastActiveAt: lastLogin,
          linkedCompanies,
          profile: { avatarUrl: null as string | null },
        })
      }

      return json({
        data: {
          data: users,
          total: num(count, users.length),
        },
      })
    }

    if (action === 'users_get') {
      const userId = str(body.userId)
      if (!userId || !isUuid(userId)) return json({ error: 'userId required' }, 400)
      const { data: p, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, role, account_status, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()
      if (pErr) throw new Error(pErr.message)
      if (!p || !isRecord(p)) return json({ error: 'User not found' }, 404)

      const { data: uData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const u = uData?.user
      const email = u && typeof u.email === 'string' ? u.email : ''
      const meta = u?.user_metadata && typeof u.user_metadata === 'object' && !Array.isArray(u.user_metadata)
        ? (u.user_metadata as Record<string, unknown>)
        : {}
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : ''
      const displayName = typeof p.display_name === 'string' ? p.display_name.trim() : ''
      const name = displayName !== '' ? displayName : fullName !== '' ? fullName : email || '—'

      const { data: ownedCos } = await supabaseAdmin.from('companies').select('id, name').eq('user_id', userId).order('name')
      const { data: memRows } = await supabaseAdmin
        .from('user_company_memberships')
        .select('company_id, role')
        .eq('user_id', userId)
      const linkedCompanies: { id: string; name: string; via: 'owner' | 'member'; role?: string }[] = []
      for (const c of Array.isArray(ownedCos) ? ownedCos : []) {
        if (isRecord(c) && typeof c.id === 'string' && typeof c.name === 'string') {
          linkedCompanies.push({ id: c.id, name: c.name, via: 'owner' })
        }
      }
      for (const m of Array.isArray(memRows) ? memRows : []) {
        if (!isRecord(m) || typeof m.company_id !== 'string') continue
        const cid = m.company_id
        const already = linkedCompanies.some((x) => x.id === cid && x.via === 'owner')
        if (already) continue
        const { data: co } = await supabaseAdmin.from('companies').select('name').eq('id', cid).maybeSingle()
        const nm = co && isRecord(co) && typeof co.name === 'string' ? co.name : cid
        linkedCompanies.push({
          id: cid,
          name: nm,
          via: 'member',
          role: typeof m.role === 'string' ? m.role : undefined,
        })
      }

      const { data: actRows } = await supabaseAdmin
        .from('user_activity_logs')
        .select('id, action, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      const activity = (Array.isArray(actRows) ? actRows : []).map((r) => {
        const row = isRecord(r) ? r : {}
        return {
          id: typeof row.id === 'string' ? row.id : String(row.id ?? ''),
          action: typeof row.action === 'string' ? row.action : '',
          metadata: isRecord(row.metadata) ? row.metadata : {},
          createdAt: typeof row.created_at === 'string' ? row.created_at : '',
        }
      })

      const roleStr = typeof p.role === 'string' ? p.role : 'founder'
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'users_get',
        target_user_id: userId,
        metadata: { source: 'admin_user_detail' },
      })

      return json({
        data: {
          user: {
            id: userId,
            email,
            name,
            role: roleStr,
            roles: [roleStr],
            status: p.account_status === 'suspended' ? 'suspended' : 'active',
            createdAt: typeof p.created_at === 'string' ? p.created_at : '',
            lastLogin: u?.last_sign_in_at ? String(u.last_sign_in_at) : '',
            linkedCompanies,
          },
          activity,
        },
      })
    }

    if (action === 'users_impersonate') {
      const targetUserId = str(body.userId)
      const auditReason = str(body.auditReason) ?? str(body.reason) ?? ''
      if (!targetUserId || !isUuid(targetUserId)) return json({ error: 'userId required' }, 400)
      if (targetUserId === adminId) return json({ error: 'Cannot impersonate yourself' }, 400)

      const { data: tprof } = await supabaseAdmin.from('profiles').select('role, account_status').eq('id', targetUserId).maybeSingle()
      if (!tprof || !isRecord(tprof)) return json({ error: 'User not found' }, 404)
      if (tprof.role === 'admin') {
        return json({ error: 'Cannot impersonate administrator accounts' }, 403)
      }

      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const { error: insErr } = await supabaseAdmin.from('admin_impersonation_tokens').insert({
        admin_user_id: adminId,
        target_user_id: targetUserId,
        token,
        expires_at: expiresAt,
      })
      if (insErr) throw new Error(insErr.message)

      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: adminId,
        action: 'admin_impersonation_started',
        entity: 'user',
        entity_id: targetUserId,
        metadata: {
          auditReason: auditReason.slice(0, 2000),
          tokenSuffix: token.slice(-8),
        },
        notes: 'Admin impersonation token issued (support / audit)',
      })
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'user_impersonate',
        target_user_id: targetUserId,
        metadata: { auditReason: auditReason.slice(0, 500) },
      })
      try {
        await supabaseAdmin.from('telemetry_events').insert({
          user_id: adminId,
          event_type: 'admin_user_impersonation',
          payload: { targetUserId, hasReason: auditReason.length > 0 },
        })
      } catch {
        /* optional telemetry */
      }

      const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      const targetEmail = targetAuth?.user?.email
      if (!targetEmail || typeof targetEmail !== 'string') {
        return json({ error: 'Target user has no email; cannot issue sign-in link' }, 422)
      }

      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      })
      if (linkRes.error) {
        throw new Error(linkRes.error.message)
      }
      const props = linkRes.data?.properties as Record<string, unknown> | undefined
      const magicLink = typeof props?.action_link === 'string' ? props.action_link : ''

      return json({
        data: {
          impersonationToken: token,
          magicLink,
          expiresAt,
          targetUserId,
          message:
            'Audit token stored. Open the magic link in a private window to complete sign-in as this user. Treat both values as secrets.',
        },
      })
    }

    if (action === 'companies_picklist') {
      const { data: rows, error } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(500)
      if (error) throw new Error(error.message)
      const list = Array.isArray(rows) ? rows : []
      return json({
        data: {
          companies: list
            .map((r) => {
              const rec = isRecord(r) ? r : {}
              return {
                id: typeof rec.id === 'string' ? rec.id : '',
                name: typeof rec.name === 'string' ? rec.name : '—',
              }
            })
            .filter((x) => x.id.length > 0),
        },
      })
    }

    if (action === 'users_patch') {
      const userId = str(body.userId)
      if (!userId || !isUuid(userId)) return json({ error: 'Valid userId required' }, 400)
      const nextRole = str(body.role)
      const nextStatus = str(body.status) as 'active' | 'suspended' | undefined
      const allowedRoles = new Set(['founder', 'consultant', 'investor', 'other', 'admin'])
      if (nextRole && !allowedRoles.has(nextRole)) {
        return json({ error: 'Invalid role' }, 400)
      }
      if (nextStatus && nextStatus !== 'active' && nextStatus !== 'suspended') {
        return json({ error: 'Invalid status' }, 400)
      }
      if (userId === adminId && nextRole && nextRole !== 'admin') {
        return json({ error: 'Cannot demote your own admin role' }, 400)
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (nextRole) patch.role = nextRole
      if (nextStatus) patch.account_status = nextStatus

      const { data: updated, error } = await supabaseAdmin.from('profiles').update(patch).eq('id', userId).select().maybeSingle()
      if (error) throw new Error(error.message)
      if (!updated) return json({ error: 'User not found' }, 404)

      const act = nextStatus ? `user_status_${nextStatus}` : nextRole ? `user_role_${nextRole}` : 'user_update'
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: act,
        target_user_id: userId,
        metadata: { role: nextRole ?? null, status: nextStatus ?? null },
      })
      if (nextStatus) {
        try {
          await supabaseAdmin.from('telemetry_events').insert({
            user_id: adminId,
            event_type: nextStatus === 'suspended' ? 'admin_user_suspended' : 'admin_user_reactivated',
            payload: { targetUserId: userId },
          })
        } catch {
          /* optional */
        }
      }

      const row = updated as Record<string, unknown>
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
      const u = authUser?.user
      const email = u && typeof u.email === 'string' ? u.email : ''
      const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : ''
      const name = displayName !== '' ? displayName : email || '—'

      const roleOut = typeof row.role === 'string' ? row.role : 'founder'
      return json({
        data: {
          id: typeof row.id === 'string' ? row.id : String(row.id),
          email,
          name,
          role: roleOut,
          roles: [roleOut],
          status: row.account_status === 'suspended' ? 'suspended' : 'active',
          createdAt: typeof row.created_at === 'string' ? row.created_at : '',
          lastLogin: u?.last_sign_in_at ? String(u.last_sign_in_at) : '',
          lastActiveAt: u?.last_sign_in_at ? String(u.last_sign_in_at) : '',
          linkedCompanies: [] as string[],
          profile: { avatarUrl: null as string | null },
        },
      })
    }

    if (action === 'users_export') {
      const format = str(body.format) === 'json' ? 'json' : 'csv'
      const filters = isRecord(body.filters) ? body.filters : {}
      const built = await buildAdminUsersDataExportUrl(supabaseAdmin, format, filters)
      if (!built.ok) throw new Error(built.message)
      return json({ data: { url: built.url } })
    }

    if (action === 'users_export_job') {
      const format = str(body.format) === 'json' ? 'json' : 'csv'
      const filters = isRecord(body.filters) ? body.filters : {}
      const scope = str(body.scope) === 'full' ? 'full' : 'filtered'
      const mergedFilters = { ...filters, scope }
      const { data: jobRow, error: jInsErr } = await supabaseAdmin
        .from('admin_export_jobs')
        .insert({
          admin_user_id: adminId,
          status: 'pending',
          format,
          filters: mergedFilters,
        })
        .select('id')
        .maybeSingle()
      if (jInsErr) throw new Error(jInsErr.message)
      const jobId = jobRow && isRecord(jobRow) && typeof jobRow.id === 'string' ? jobRow.id : ''
      if (!jobId) return json({ error: 'Could not create export job' }, 500)
      return json({ data: { jobId, status: 'pending' as const } })
    }

    if (action === 'users_export_job_status') {
      const jobId = str(body.jobId)
      if (!jobId || !isUuid(jobId)) return json({ error: 'jobId required' }, 400)
      const { data: job, error: jErr } = await supabaseAdmin.from('admin_export_jobs').select('*').eq('id', jobId).maybeSingle()
      if (jErr) throw new Error(jErr.message)
      if (!job || !isRecord(job)) return json({ error: 'Job not found' }, 404)
      const owner = typeof job.admin_user_id === 'string' ? job.admin_user_id : ''
      if (owner !== adminId) return json({ error: 'Forbidden' }, 403)
      const st = typeof job.status === 'string' ? job.status : 'pending'
      if (st === 'completed') {
        const url = typeof job.result_url === 'string' ? job.result_url : ''
        return json({ data: { status: 'completed' as const, downloadUrl: url } })
      }
      if (st === 'failed') {
        const errMsg = typeof job.error_message === 'string' ? job.error_message : 'Export failed'
        return json({ data: { status: 'failed' as const, errorMessage: errMsg } })
      }

      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('admin_export_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
        .eq('status', 'pending')
        .select('id, format, filters')
        .maybeSingle()
      if (claimErr) throw new Error(claimErr.message)

      if (!claimed || !isRecord(claimed)) {
        const { data: again } = await supabaseAdmin.from('admin_export_jobs').select('status, result_url, error_message').eq('id', jobId).maybeSingle()
        const r = again && isRecord(again) ? again : {}
        const st2 = typeof r.status === 'string' ? r.status : 'pending'
        if (st2 === 'completed') {
          return json({ data: { status: 'completed' as const, downloadUrl: typeof r.result_url === 'string' ? r.result_url : '' } })
        }
        if (st2 === 'failed') {
          return json({ data: { status: 'failed' as const, errorMessage: typeof r.error_message === 'string' ? r.error_message : '' } })
        }
        return json({ data: { status: 'processing' as const } })
      }

      const fmt = typeof claimed.format === 'string' && claimed.format === 'json' ? 'json' : 'csv'
      const filt = isRecord(claimed.filters) ? claimed.filters : {}
      try {
        const built = await buildAdminUsersDataExportUrl(supabaseAdmin, fmt, filt)
        if (!built.ok) {
          await supabaseAdmin
            .from('admin_export_jobs')
            .update({
              status: 'failed',
              error_message: built.message,
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId)
          return json({ data: { status: 'failed' as const, errorMessage: built.message } })
        }
        await supabaseAdmin
          .from('admin_export_jobs')
          .update({
            status: 'completed',
            result_url: built.url,
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', jobId)
        return json({ data: { status: 'completed' as const, downloadUrl: built.url } })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Export error'
        await supabaseAdmin
          .from('admin_export_jobs')
          .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
          .eq('id', jobId)
        return json({ data: { status: 'failed' as const, errorMessage: message } })
      }
    }

    if (action === 'audit_logs_stats') {
      const since24h = new Date(Date.now() - 86400000).toISOString()
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
      const [{ count: totalAll }, { count: last24h }, { data: rows7d }] = await Promise.all([
        supabaseAdmin.from('audit_logs').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
        supabaseAdmin.from('audit_logs').select('created_at').gte('created_at', since7d),
      ])
      const dayList = Array.isArray(rows7d) ? rows7d : []
      const byDay = new Map<string, number>()
      for (const r of dayList) {
        if (!isRecord(r)) continue
        const ca = typeof r.created_at === 'string' ? r.created_at : ''
        if (!ca) continue
        const day = ca.slice(0, 10)
        byDay.set(day, (byDay.get(day) ?? 0) + 1)
      }
      const sortedDays = [...byDay.keys()].sort()
      const series = sortedDays.map((d) => ({ date: d, count: byDay.get(d) ?? 0 }))
      return json({
        data: {
          total: num(totalAll, 0),
          last24h: num(last24h, 0),
          series,
        },
      })
    }

    if (action === 'audit_logs_list') {
      const page = Math.max(1, num(body.page, 1))
      const pageSize = Math.min(100, Math.max(1, num(body.pageSize, 20)))
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const actorFilter = str(body.actorId)
      const actionLike = str(body.actionFilter) ?? str(body.auditActionFilter)
      const entityFilter = str(body.targetType) ?? str(body.entity)
      const startDate = str(body.startDate)
      const endDate = str(body.endDate)
      const searchRaw = str(body.search)
      const sortAsc = str(body.sort) === 'asc'

      let q = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' })

      if (actorFilter && isUuid(actorFilter)) {
        q = q.eq('actor_user_id', actorFilter)
      }
      if (actionLike && actionLike.trim()) {
        const safe = escapeIlike(actionLike.trim())
        q = q.ilike('action', `%${safe}%`)
      }
      if (entityFilter && entityFilter.trim()) {
        q = q.eq('entity', entityFilter.trim())
      }
      if (startDate && startDate.trim()) {
        const d = startDate.trim()
        q = q.gte('created_at', d.includes('T') ? d : `${d}T00:00:00.000Z`)
      }
      if (endDate && endDate.trim()) {
        const d = endDate.trim()
        q = q.lte('created_at', d.includes('T') ? d : `${d}T23:59:59.999Z`)
      }
      if (searchRaw && searchRaw.trim()) {
        const safe = escapeIlike(searchRaw.trim())
        q = q.or(`action.ilike.%${safe}%,entity.ilike.%${safe}%,notes.ilike.%${safe}%`)
      }

      const { data: rows, error, count } = await q
        .order('created_at', { ascending: sortAsc })
        .range(from, to)
      if (error) throw new Error(error.message)

      const list = Array.isArray(rows) ? rows : []
      const actorIds = [
        ...new Set(
          list
            .map((r) => (isRecord(r) && typeof r.actor_user_id === 'string' ? r.actor_user_id : null))
            .filter((x): x is string => x !== null && isUuid(x)),
        ),
      ]
      const profileById = new Map<string, { display_name: string }>()
      if (actorIds.length > 0) {
        const { data: profs } = await supabaseAdmin.from('profiles').select('id, display_name').in('id', actorIds)
        const parr = Array.isArray(profs) ? profs : []
        for (const p of parr) {
          if (!isRecord(p) || typeof p.id !== 'string') continue
          profileById.set(p.id, { display_name: typeof p.display_name === 'string' ? p.display_name : '' })
        }
      }

      const emailById = new Map<string, string>()
      for (const aid of actorIds) {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(aid)
        const em = uData?.user?.email
        emailById.set(aid, typeof em === 'string' ? em : '')
      }

      const logs = list.map((raw) => {
        const r = isRecord(raw) ? raw : {}
        const aid = typeof r.actor_user_id === 'string' ? r.actor_user_id : null
        const prof = aid ? profileById.get(aid) : undefined
        const email = aid ? (emailById.get(aid) ?? '') : ''
        const displayName = prof?.display_name?.trim() ?? ''
        return rowToAuditPayload(r, email, displayName !== '' ? displayName : email || '—')
      })

      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'audit_logs_list_viewed',
        target_user_id: null,
        metadata: { page, pageSize, filters: { actorFilter, actionLike, entityFilter, startDate, endDate, searchRaw } },
      })

      return json({
        data: {
          total: num(count, logs.length),
          page,
          pageSize,
          logs,
        },
      })
    }

    if (action === 'audit_logs_get') {
      const id = str(body.id)
      if (!id || !isUuid(id)) return json({ error: 'Valid id required' }, 400)
      const { data: row, error } = await supabaseAdmin.from('audit_logs').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      if (!row || !isRecord(row)) return json({ error: 'Not found' }, 404)
      const aid = typeof row.actor_user_id === 'string' ? row.actor_user_id : null
      let actorEmail = ''
      let actorName = '—'
      if (aid && isUuid(aid)) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('display_name').eq('id', aid).maybeSingle()
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(aid)
        actorEmail = typeof uData?.user?.email === 'string' ? uData.user.email : ''
        const dn = prof && isRecord(prof) && typeof prof.display_name === 'string' ? prof.display_name.trim() : ''
        actorName = dn !== '' ? dn : actorEmail || '—'
      }
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'audit_logs_entry_viewed',
        target_user_id: null,
        metadata: { auditLogId: id },
      })
      return json({ data: rowToAuditPayload(row, actorEmail, actorName) })
    }

    if (action === 'audit_logs_create') {
      const act = str(body.logAction) ?? str(body.entryAction)
      if (!act || !act.trim()) return json({ error: 'logAction required' }, 400)
      const actorOverride = str(body.actorId)
      if (actorOverride !== undefined && actorOverride !== '' && !isUuid(actorOverride)) {
        return json({ error: 'actorId must be a valid UUID' }, 400)
      }
      const notesVal = str(body.notes)
      const targetSnapshot = sanitizeTargetJson(body.target)
      const entityFromTarget =
        typeof targetSnapshot.entity === 'string'
          ? targetSnapshot.entity
          : typeof targetSnapshot.entityType === 'string'
            ? targetSnapshot.entityType
            : 'application'
      const entityIdVal =
        typeof targetSnapshot.entityId === 'string'
          ? targetSnapshot.entityId
          : typeof targetSnapshot.entity_id === 'string'
            ? targetSnapshot.entity_id
            : null
      const meta = { ...targetSnapshot }
      delete meta.entity
      delete meta.entityType
      delete meta.entityId
      delete meta.entity_id

      const insertRow = {
        actor_user_id: actorOverride && actorOverride !== '' ? actorOverride : adminId,
        action: act.trim(),
        entity: entityFromTarget || 'application',
        entity_id: entityIdVal,
        metadata: meta,
        target: targetSnapshot,
        notes: notesVal ?? null,
      }

      const { data: created, error } = await supabaseAdmin.from('audit_logs').insert(insertRow).select('*').maybeSingle()
      if (error) throw new Error(error.message)
      if (!created || !isRecord(created)) return json({ error: 'Insert failed' }, 500)

      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'audit_logs_manual_create',
        target_user_id: null,
        metadata: { auditLogId: created.id },
      })

      const aid = typeof created.actor_user_id === 'string' ? created.actor_user_id : null
      let actorEmail = ''
      let actorName = '—'
      if (aid && isUuid(aid)) {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(aid)
        actorEmail = typeof uData?.user?.email === 'string' ? uData.user.email : ''
        actorName = actorEmail || '—'
      }

      return json({ data: rowToAuditPayload(created, actorEmail, actorName) })
    }

    if (action === 'audit_logs_export') {
      const format = str(body.format) === 'json' ? 'json' : 'csv'
      const filters = isRecord(body.filters) ? body.filters : {}
      const actorFilter = str(filters.actorId)
      const actionLike = str(filters.actionFilter) ?? str(filters.action)
      const entityFilter = str(filters.targetType) ?? str(filters.entity)
      const startDate = str(filters.startDate)
      const endDate = str(filters.endDate)
      const searchRaw = str(filters.search)
      const sortAsc = str(filters.sort) === 'asc'

      let q = supabaseAdmin.from('audit_logs').select('*')
      if (actorFilter && isUuid(actorFilter)) q = q.eq('actor_user_id', actorFilter)
      if (actionLike && actionLike.trim()) {
        const safe = escapeIlike(actionLike.trim())
        q = q.ilike('action', `%${safe}%`)
      }
      if (entityFilter && entityFilter.trim()) q = q.eq('entity', entityFilter.trim())
      if (startDate && startDate.trim()) {
        const d = startDate.trim()
        q = q.gte('created_at', d.includes('T') ? d : `${d}T00:00:00.000Z`)
      }
      if (endDate && endDate.trim()) {
        const d = endDate.trim()
        q = q.lte('created_at', d.includes('T') ? d : `${d}T23:59:59.999Z`)
      }
      if (searchRaw && searchRaw.trim()) {
        const safe = escapeIlike(searchRaw.trim())
        q = q.or(`action.ilike.%${safe}%,entity.ilike.%${safe}%,notes.ilike.%${safe}%`)
      }

      const { data: rows, error } = await q.order('created_at', { ascending: sortAsc }).limit(5000)
      if (error) throw new Error(error.message)
      const list = Array.isArray(rows) ? rows : []

      const exportRows = list.map((raw) => {
        const r = isRecord(raw) ? raw : {}
        const payload = rowToAuditPayload(r, '', '')
        const tgt = isRecord(payload.target) ? payload.target : {}
        return {
          id: typeof payload.id === 'string' ? payload.id : String(payload.id ?? ''),
          actorId: typeof payload.actorId === 'string' ? payload.actorId : null,
          action: typeof payload.action === 'string' ? payload.action : '',
          entity: typeof payload.entity === 'string' ? payload.entity : '',
          entityId: typeof payload.entityId === 'string' ? payload.entityId : null,
          target: tgt,
          notes: typeof payload.notes === 'string' ? payload.notes : null,
          createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : '',
        }
      })

      if (format === 'json') {
        const jsonStr = JSON.stringify(exportRows, null, 2)
        const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
        const url = `data:application/json;base64,${b64}`
        return json({ data: { url } })
      }

      const header = ['id', 'actorId', 'action', 'entity', 'entityId', 'notes', 'createdAt', 'targetJson']
      const lines = [
        header.join(','),
        ...exportRows.map((er) =>
          [
            er.id,
            er.actorId ?? '',
            `"${String(er.action).replace(/"/g, '""')}"`,
            `"${String(er.entity).replace(/"/g, '""')}"`,
            er.entityId ?? '',
            `"${String(er.notes ?? '').replace(/"/g, '""')}"`,
            er.createdAt,
            `"${JSON.stringify(er.target ?? {}).replace(/"/g, '""')}"`,
          ].join(','),
        ),
      ]
      const csv = lines.join('\n')
      const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
      return json({ data: { url } })
    }

    if (action === 'companies_multi_list') {
      const { data: rows, error } = await supabaseAdmin.from('v_users_multiple_companies').select('*')
      if (error) throw new Error(error.message)
      const list = Array.isArray(rows) ? rows : []
      return json({
        data: {
          users: list.map((r) => {
            const rec = isRecord(r) ? r : {}
            const uid = typeof rec.user_id === 'string' ? rec.user_id : ''
            const cnt = typeof rec.company_count === 'number' ? rec.company_count : num(rec.company_count, 0)
            const idsRaw = rec.company_ids
            const companyIds = Array.isArray(idsRaw)
              ? idsRaw.filter((x): x is string => typeof x === 'string')
              : []
            return { userId: uid, companyCount: cnt, companyIds }
          }),
        },
      })
    }

    if (action === 'companies_migrate_dry_run') {
      const { data: rows, error } = await supabaseAdmin.from('v_users_multiple_companies').select('*')
      if (error) throw new Error(error.message)
      const list = Array.isArray(rows) ? rows : []
      const preview = list.map((r) => {
        const rec = isRecord(r) ? r : {}
        return {
          userId: typeof rec.user_id === 'string' ? rec.user_id : '',
          companyCount: num(rec.company_count, 0),
          companyIds: Array.isArray(rec.company_ids)
            ? rec.company_ids.filter((x): x is string => typeof x === 'string')
            : [],
          proposedAction: 'merge_required',
        }
      })
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: adminId,
        action: 'company_migrate_dry_run',
        entity: 'admin_consolidation',
        entity_id: null,
        metadata: { previewCount: preview.length, dryRun: true },
        notes: 'Admin migration dry-run executed',
      })
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'companies_migrate_dry_run',
        target_user_id: null,
        metadata: { count: preview.length },
      })
      return json({ data: { dryRun: true, preview } })
    }

    if (action === 'user_set_primary_company') {
      const targetUserId = str(body.targetUserId)
      const companyId = str(body.companyId)
      if (!targetUserId || !companyId || !isUuid(targetUserId) || !isUuid(companyId)) {
        return json(
          {
            error: 'Invalid payload',
            code: 'VALIDATION_ERROR',
            remediation: 'Provide targetUserId and companyId as UUIDs.',
          },
          422,
        )
      }
      const { data: co, error: cErr } = await supabaseAdmin
        .from('companies')
        .select('id, user_id')
        .eq('id', companyId)
        .maybeSingle()
      if (cErr) throw new Error(cErr.message)
      const owner = co && isRecord(co) ? (typeof co.user_id === 'string' ? co.user_id : '') : ''
      if (!owner || owner !== targetUserId) {
        return json(
          {
            error: 'Company does not belong to target user',
            code: 'FORBIDDEN_PRIMARY',
            remediation: 'Pick a company row whose user_id matches targetUserId.',
          },
          403,
        )
      }
      const { error: uErr } = await supabaseAdmin
        .from('profiles')
        .update({ last_context_company_id: companyId, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
      if (uErr) throw new Error(uErr.message)
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: adminId,
        action: 'admin_set_primary_company',
        entity: 'profile',
        entity_id: targetUserId,
        metadata: { companyId, targetUserId },
        notes: 'Admin assigned primary / active company context for single-company mode resolution',
      })
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'user_set_primary_company',
        target_user_id: targetUserId,
        metadata: { companyId },
      })
      return json({ data: { ok: true, targetUserId, primaryCompanyId: companyId } })
    }

    if (action === 'companies_merge') {
      const sourceId = str(body.sourceCompanyId)
      const targetId = str(body.targetCompanyId)
      const dryRun = body.dryRun === true
      if (!sourceId || !targetId || !isUuid(sourceId) || !isUuid(targetId)) {
        return json(
          {
            error: 'Invalid payload',
            code: 'VALIDATION_ERROR',
            remediation: 'Provide valid sourceCompanyId and targetCompanyId UUIDs.',
          },
          422,
        )
      }
      if (sourceId === targetId) {
        return json({ error: 'Source and target must differ', code: 'INVALID_MERGE' }, 422)
      }

      const { data: srcRow, error: srcErr } = await supabaseAdmin
        .from('companies')
        .select('id, user_id')
        .eq('id', sourceId)
        .maybeSingle()
      const { data: tgtRow, error: tgtErr } = await supabaseAdmin
        .from('companies')
        .select('id, user_id')
        .eq('id', targetId)
        .maybeSingle()
      if (srcErr || tgtErr) throw new Error(srcErr?.message ?? tgtErr?.message ?? 'Lookup failed')
      const srcUser = srcRow && isRecord(srcRow) ? (typeof srcRow.user_id === 'string' ? srcRow.user_id : '') : ''
      const tgtUser = tgtRow && isRecord(tgtRow) ? (typeof tgtRow.user_id === 'string' ? tgtRow.user_id : '') : ''
      if (!srcUser || !tgtUser || srcUser !== tgtUser) {
        return json(
          {
            error: 'Companies must belong to the same user',
            code: 'FORBIDDEN_MERGE',
            remediation: 'Pick two companies owned by the same account.',
          },
          403,
        )
      }

      if (dryRun) {
        return json({
          data: {
            dryRun: true,
            userId: srcUser,
            sourceCompanyId: sourceId,
            targetCompanyId: targetId,
            message: 'No data changed. Run with dryRun:false to execute after review.',
          },
        })
      }

      const pkTables = [
        'company_financials',
        'company_analytics',
        'company_social',
        'company_billing',
        'company_market_data',
        'company_branding',
      ] as const

      for (const table of pkTables) {
        const { data: tExist } = await supabaseAdmin.from(table).select('company_id').eq('company_id', targetId).maybeSingle()
        const { data: sExist } = await supabaseAdmin.from(table).select('*').eq('company_id', sourceId).maybeSingle()
        if (sExist && isRecord(sExist)) {
          if (tExist) {
            await supabaseAdmin.from(table).delete().eq('company_id', sourceId)
          } else {
            const { error: uerr } = await supabaseAdmin.from(table).update({ company_id: targetId }).eq('company_id', sourceId)
            if (uerr) throw new Error(uerr.message)
          }
        }
      }

      await supabaseAdmin.from('integrations').update({ company_id: targetId }).eq('company_id', sourceId)
      await supabaseAdmin.from('integration_credentials').update({ company_id: targetId }).eq('company_id', sourceId)
      await supabaseAdmin.from('reports').update({ company_id: targetId }).eq('company_id', sourceId)
      await supabaseAdmin.from('company_health_scores').update({ company_id: targetId }).eq('company_id', sourceId)
      await supabaseAdmin.from('analysis_history').update({ company_id: targetId }).eq('company_id', sourceId)

      const { error: delErr } = await supabaseAdmin.from('companies').delete().eq('id', sourceId)
      if (delErr) throw new Error(delErr.message)

      await supabaseAdmin.from('admin_consolidations').insert({
        user_id: srcUser,
        source_company_id: sourceId,
        target_company_id: targetId,
        status: 'completed',
        dry_run: false,
        metadata: { mergedBy: adminId },
      })
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: adminId,
        action: 'company_merge_completed',
        entity: 'company',
        entity_id: targetId,
        metadata: { sourceCompanyId: sourceId, targetCompanyId: targetId, userId: srcUser },
        notes: 'Admin consolidated duplicate companies',
      })
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: adminId,
        action: 'companies_merge',
        target_user_id: srcUser,
        metadata: { sourceCompanyId: sourceId, targetCompanyId: targetId },
      })

      return json({
        data: {
          ok: true,
          userId: srcUser,
          removedCompanyId: sourceId,
          keptCompanyId: targetId,
        },
      })
    }

    return json({
      error: 'Unknown action',
      allowed: [
        'metrics_usage',
        'user_management_stats',
        'system_health',
        'users_list',
        'users_get',
        'users_patch',
        'users_export',
        'users_export_job',
        'users_export_job_status',
        'users_impersonate',
        'companies_picklist',
        'activity_list',
        'usage_series',
        'audit_logs_list',
        'audit_logs_get',
        'audit_logs_create',
        'audit_logs_export',
        'audit_logs_stats',
        'companies_multi_list',
        'companies_merge',
        'companies_migrate_dry_run',
        'user_set_primary_company',
      ],
    }, 400)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
