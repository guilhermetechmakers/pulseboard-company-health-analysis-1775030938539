/**
 * PulseBoard unified search (Supabase Edge Function).
 * Integrates with: companies, reports, profiles — respects RLS via user JWT; admins use service role for cross-tenant reads.
 * Operations: search (POST), autosuggest (POST), preview (POST) — body: { op, ... }.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type EntityType = 'company' | 'report' | 'user'
type SearchScope = 'companies' | 'reports' | 'users' | 'all'

type SearchItem = {
  id: string
  type: EntityType
  title: string
  subtitle?: string
  snippets?: string[]
  updatedAt?: string
  ownerId?: string
}

type FilterPayload = {
  scopes?: string[]
  industry?: string[]
  healthScore?: { min?: number; max?: number }
  lastAnalyzed?: { since?: string; until?: string }
  ownerIds?: string[]
  tags?: string[]
  reportStatus?: string[]
}

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

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

function snippetFromText(text: string | null | undefined, max = 140): string | undefined {
  if (!text || !text.trim()) return undefined
  const t = text.replace(/\s+/g, ' ').trim()
  return clampStr(t, max)
}

function rankTextMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (!n) return 0
  if (h === n) return 100
  if (h.startsWith(n)) return 80
  if (h.includes(n)) return 60
  return 40
}

async function requireUser(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) }
  }
  const jwt = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(jwt)
  if (error || !data.user) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) }
  }
  return { ok: true, userId: data.user.id }
}

async function loadIsAdmin(supabaseAdmin: SupabaseClient, userId: string): Promise<boolean> {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role, account_status')
    .eq('id', userId)
    .maybeSingle()
  if (!prof || typeof prof !== 'object') return false
  const role = (prof as { role?: string }).role
  const status = (prof as { account_status?: string }).account_status
  return role === 'admin' && status !== 'suspended'
}

function rowCompanyToItem(
  row: Record<string, unknown>,
  snippets?: string[],
): SearchItem | null {
  const id = typeof row.id === 'string' ? row.id : null
  const name = typeof row.name === 'string' ? row.name : null
  if (!id || !name) return null
  const industry = typeof row.industry === 'string' ? row.industry : undefined
  const uid = typeof row.user_id === 'string' ? row.user_id : undefined
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : undefined
  return {
    id,
    type: 'company',
    title: name,
    subtitle: industry,
    snippets: snippets && snippets.length ? snippets : undefined,
    updatedAt,
    ownerId: uid,
  }
}

function rowReportToItem(
  row: Record<string, unknown>,
  companyName?: string,
  snippets?: string[],
): SearchItem | null {
  const id = typeof row.id === 'string' ? row.id : null
  if (!id) return null
  const status = typeof row.status === 'string' ? row.status : 'unknown'
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : undefined
  const summary = typeof row.executive_summary === 'string' ? row.executive_summary : null
  const title = companyName ? `Report — ${companyName}` : 'Analysis report'
  const sn = snippets?.length ? snippets : summary ? [snippetFromText(summary) ?? ''] : undefined
  return {
    id,
    type: 'report',
    title,
    subtitle: status,
    snippets: sn,
    updatedAt,
  }
}

function rowProfileToItem(row: Record<string, unknown>): SearchItem | null {
  const id = typeof row.id === 'string' ? row.id : null
  if (!id) return null
  const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : ''
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  const role = typeof row.role === 'string' ? row.role : undefined
  const title = displayName || email || 'User'
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : undefined
  return {
    id,
    type: 'user',
    title,
    subtitle: email || role,
    updatedAt,
    ownerId: id,
  }
}

async function fetchLatestHealthScores(
  db: SupabaseClient,
  companyIds: string[],
): Promise<Map<string, { overall: number; scoredAt: string }>> {
  const map = new Map<string, { overall: number; scoredAt: string }>()
  const ids = (companyIds ?? []).filter(Boolean)
  if (ids.length === 0) return map
  const { data, error } = await db
    .from('company_health_scores')
    .select('company_id, overall, scored_at')
    .in('company_id', ids)
    .order('scored_at', { ascending: false })
    .limit(500)
  if (error || !Array.isArray(data)) return map
  for (const r of data) {
    if (!isRecord(r)) continue
    const cid = typeof r.company_id === 'string' ? r.company_id : null
    const overall = num(r.overall, NaN)
    const scoredAt = typeof r.scored_at === 'string' ? r.scored_at : ''
    if (!cid || !Number.isFinite(overall)) continue
    if (!map.has(cid)) {
      map.set(cid, { overall, scoredAt })
    }
  }
  return map
}

async function fetchLatestReportActivity(
  db: SupabaseClient,
  companyIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const ids = (companyIds ?? []).filter(Boolean)
  if (ids.length === 0) return map
  const { data, error } = await db
    .from('reports')
    .select('company_id, updated_at')
    .in('company_id', ids)
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error || !Array.isArray(data)) return map
  for (const r of data) {
    if (!isRecord(r)) continue
    const cid = typeof r.company_id === 'string' ? r.company_id : null
    const u = typeof r.updated_at === 'string' ? r.updated_at : ''
    if (cid && u && !map.has(cid)) map.set(cid, u)
  }
  return map
}

function parseFilters(raw: unknown): FilterPayload {
  if (!isRecord(raw)) return {}
  let healthScore: FilterPayload['healthScore']
  if (isRecord(raw.healthScore)) {
    const min = num(raw.healthScore.min, NaN)
    const max = num(raw.healthScore.max, NaN)
    const o: { min?: number; max?: number } = {}
    if (Number.isFinite(min)) o.min = min
    if (Number.isFinite(max)) o.max = max
    if (Object.keys(o).length > 0) healthScore = o
  }
  return {
    scopes: asStringArray(raw.scopes),
    industry: asStringArray(raw.industry),
    healthScore,
    lastAnalyzed: isRecord(raw.lastAnalyzed)
      ? {
          since: str(raw.lastAnalyzed.since),
          until: str(raw.lastAnalyzed.until),
        }
      : undefined,
    ownerIds: asStringArray(raw.ownerIds),
    tags: asStringArray(raw.tags),
    reportStatus: asStringArray(raw.reportStatus),
  }
}

function lastAnalyzedBoundary(
  companyId: string,
  healthMap: Map<string, { overall: number; scoredAt: string }>,
  reportMap: Map<string, string>,
): string | null {
  const h = healthMap.get(companyId)?.scoredAt
  const r = reportMap.get(companyId)
  if (h && r) return h > r ? h : r
  return h ?? r ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await req.json()
    body = isRecord(raw) ? raw : {}
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const op = str(body.op) ?? ''
  const auth = await requireUser(req, supabaseAdmin)
  if (!auth.ok) return auth.response

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const isAdmin = await loadIsAdmin(supabaseAdmin, auth.userId)
  const dbRead: SupabaseClient = isAdmin ? supabaseAdmin : userClient

  try {
    if (op === 'autosuggest') {
      const inputRaw = str(body.input) ?? ''
      const input = clampStr(inputRaw.trim(), 120)
      const limitEach = 6

      const companies: SearchItem[] = []
      const reports: SearchItem[] = []
      const users: SearchItem[] = []

      if (input.length >= 1) {
        const safe = escapeIlike(input)
        const { data: cRows } = await dbRead
          .from('companies')
          .select('id, user_id, name, industry, updated_at')
          .or(`name.ilike.%${safe}%,industry.ilike.%${safe}%`)
          .order('updated_at', { ascending: false })
          .limit(limitEach)

        for (const row of cRows ?? []) {
          if (!isRecord(row)) continue
          const item = rowCompanyToItem(row, [clampStr(input, 80)])
          if (item) companies.push(item)
        }

        const { data: rRows } = await dbRead
          .from('reports')
          .select('id, company_id, status, executive_summary, updated_at')
          .ilike('executive_summary', `%${safe}%`)
          .order('updated_at', { ascending: false })
          .limit(limitEach)

        const companyIds = [...new Set((rRows ?? []).map((x) => isRecord(x) && typeof x.company_id === 'string' ? x.company_id : '').filter(Boolean))]
        const nameByCompany: Record<string, string> = {}
        if (companyIds.length) {
          const { data: cn } = await dbRead.from('companies').select('id, name').in('id', companyIds)
          for (const r of cn ?? []) {
            if (isRecord(r) && typeof r.id === 'string' && typeof r.name === 'string') {
              nameByCompany[r.id] = r.name
            }
          }
        }

        for (const row of rRows ?? []) {
          if (!isRecord(row)) continue
          const cid = typeof row.company_id === 'string' ? row.company_id : ''
          const item = rowReportToItem(row, nameByCompany[cid], [snippetFromText(str(row.executive_summary)) ?? ''])
          if (item) reports.push(item)
        }

        if (isAdmin) {
          const { data: pRows } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, email, role, updated_at')
            .or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`)
            .order('updated_at', { ascending: false })
            .limit(limitEach)
          for (const row of pRows ?? []) {
            if (!isRecord(row)) continue
            const item = rowProfileToItem(row)
            if (item) users.push(item)
          }
        } else {
          const { data: selfRow } = await userClient
            .from('profiles')
            .select('id, display_name, email, role, updated_at')
            .eq('id', auth.userId)
            .maybeSingle()
          if (isRecord(selfRow)) {
            const dn = str(selfRow.display_name) ?? ''
            const em = str(selfRow.email) ?? ''
            const hay = `${dn} ${em}`.toLowerCase()
            if (hay.includes(input.toLowerCase())) {
              const item = rowProfileToItem(selfRow)
              if (item) users.push(item)
            }
          }
        }
      }

      return json({
        data: {
          companies,
          reports,
          users,
        },
      })
    }

    if (op === 'preview') {
      const id = str(body.id)
      const entityType = str(body.entityType) as EntityType | undefined
      if (!id || !entityType || !['company', 'report', 'user'].includes(entityType)) {
        return json({ error: 'id and entityType required' }, 400)
      }

      if (entityType === 'company') {
        const { data, error } = await userClient.from('companies').select('*').eq('id', id).maybeSingle()
        if (error) throw new Error(error.message)
        if (!isRecord(data)) {
          return json({ data: null, error: 'not_found' }, 404)
        }
        return json({
          data: {
            id,
            type: 'company' as const,
            title: str(data.name) ?? 'Company',
            summary: snippetFromText(
              [str(data.industry), str(data.stage), str(data.website)].filter(Boolean).join(' · '),
              400,
            ),
            raw: data,
          },
        })
      }

      if (entityType === 'report') {
        const { data, error } = await userClient.from('reports').select('*').eq('id', id).maybeSingle()
        if (error) throw new Error(error.message)
        if (!isRecord(data)) {
          return json({ data: null, error: 'not_found' }, 404)
        }
        const summary = snippetFromText(str(data.executive_summary), 500)
        return json({
          data: {
            id,
            type: 'report' as const,
            title: 'Analysis report',
            summary,
            raw: data,
          },
        })
      }

      const profileClient = isAdmin ? supabaseAdmin : userClient
      const { data, error } = await profileClient.from('profiles').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      if (!isRecord(data)) {
        return json({ data: null, error: 'not_found' }, 404)
      }
      if (!isAdmin && id !== auth.userId) {
        return json({ error: 'Forbidden' }, 403)
      }
      return json({
        data: {
          id,
          type: 'user' as const,
          title: str(data.display_name) || str(data.email) || 'User',
          summary: str(data.email),
          raw: data,
        },
      })
    }

    if (op === 'search') {
      const queryRaw = str(body.query) ?? ''
      const query = clampStr(queryRaw.trim(), 200)
      const scopeRaw = (str(body.scope) ?? 'all') as SearchScope
      const scope: SearchScope = ['companies', 'reports', 'users', 'all'].includes(scopeRaw) ? scopeRaw : 'all'
      const filters = parseFilters(body.filters)
      const page = Math.max(1, num(isRecord(body.pagination) ? body.pagination.page : undefined, 1))
      const pageSize = Math.min(200, Math.max(1, num(isRecord(body.pagination) ? body.pagination.pageSize : undefined, 20)))

      const scopeSet = new Set(filters.scopes?.length ? filters.scopes : ['companies', 'reports', 'users'])
      const includeCompanies = scope === 'all' ? scopeSet.has('companies') : scope === 'companies'
      const includeReports = scope === 'all' ? scopeSet.has('reports') : scope === 'reports'
      const includeUsers = scope === 'all' ? scopeSet.has('users') : scope === 'users'

      const items: (SearchItem & { _rank?: number })[] = []
      const fetchCap = 120

      if (includeCompanies) {
        let cq = dbRead.from('companies').select('id, user_id, name, industry, search_tags, stage, updated_at')
        if (filters.ownerIds?.length && isAdmin) {
          cq = cq.in('user_id', filters.ownerIds)
        }
        if (filters.industry?.length) {
          cq = cq.in('industry', filters.industry)
        }
        if (filters.tags?.length) {
          cq = cq.overlaps('search_tags', filters.tags)
        }
        if (query.length >= 1) {
          const safe = escapeIlike(query)
          cq = cq.or(`name.ilike.%${safe}%,industry.ilike.%${safe}%`)
        }
        const { data: cRows, error: cErr } = await cq.order('updated_at', { ascending: false }).limit(fetchCap)
        if (cErr) throw new Error(cErr.message)

        const companyList = (cRows ?? []).filter(isRecord)
        const cids = companyList.map((r) => str(r.id)).filter((x): x is string => Boolean(x))
        const healthMap = await fetchLatestHealthScores(dbRead, cids)
        const reportActivity = await fetchLatestReportActivity(dbRead, cids)

        const hsMin = filters.healthScore?.min
        const hsMax = filters.healthScore?.max
        const since = filters.lastAnalyzed?.since
        const until = filters.lastAnalyzed?.until

        for (const row of companyList) {
          const id = str(row.id)
          if (!id) continue
          const overall = healthMap.get(id)?.overall
          if (hsMin !== undefined && Number.isFinite(hsMin) && (overall === undefined || overall < hsMin)) continue
          if (hsMax !== undefined && Number.isFinite(hsMax) && (overall === undefined || overall > hsMax)) continue

          const lastA = lastAnalyzedBoundary(id, healthMap, reportActivity)
          if (since && (!lastA || lastA < since)) continue
          if (until && (!lastA || lastA > until)) continue

          const name = str(row.name) ?? ''
          const rank = rankTextMatch(name, query) + (overall !== undefined ? 0 : -5)
          const item = rowCompanyToItem(row, query ? [query] : undefined)
          if (item) items.push({ ...item, _rank: rank } as SearchItem & { _rank: number })
        }
      }

      if (includeReports) {
        let rq = dbRead
          .from('reports')
          .select('id, company_id, status, executive_summary, updated_at')
        if (filters.reportStatus?.length) {
          rq = rq.in('status', filters.reportStatus)
        }
        if (query.length >= 1) {
          const safe = escapeIlike(query)
          rq = rq.ilike('executive_summary', `%${safe}%`)
        }
        const { data: rRows, error: rErr } = await rq.order('updated_at', { ascending: false }).limit(fetchCap)
        if (rErr) throw new Error(rErr.message)

        const rlist = (rRows ?? []).filter(isRecord)
        const companyIds = [...new Set(rlist.map((r) => str(r.company_id)).filter((x): x is string => Boolean(x)))]
        const nameByCompany: Record<string, string> = {}
        if (companyIds.length) {
          const { data: cn } = await dbRead.from('companies').select('id, name').in('id', companyIds)
          for (const r of cn ?? []) {
            if (isRecord(r) && typeof r.id === 'string' && typeof r.name === 'string') {
              nameByCompany[r.id] = r.name
            }
          }
        }

        const since = filters.lastAnalyzed?.since
        const until = filters.lastAnalyzed?.until

        for (const row of rlist) {
          const updatedAt = str(row.updated_at)
          if (since && (!updatedAt || updatedAt < since)) continue
          if (until && (!updatedAt || updatedAt > until)) continue

          const cid = str(row.company_id) ?? ''
          const titleMatch = rankTextMatch(nameByCompany[cid] ?? '', query)
          const sum = str(row.executive_summary) ?? ''
          const sumRank = rankTextMatch(sum, query)
          const rank = Math.max(titleMatch, sumRank) - 10
          const item = rowReportToItem(row, nameByCompany[cid], [snippetFromText(sum) ?? ''])
          if (item) items.push({ ...item, _rank: rank } as SearchItem & { _rank: number })
        }
      }

      if (includeUsers) {
        if (isAdmin) {
          let uq = supabaseAdmin.from('profiles').select('id, display_name, email, role, updated_at')
          if (query.length >= 1) {
            const safe = escapeIlike(query)
            uq = uq.or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`)
          }
          if (filters.ownerIds?.length) {
            uq = uq.in('id', filters.ownerIds)
          }
          const { data: uRows, error: uErr } = await uq.order('updated_at', { ascending: false }).limit(fetchCap)
          if (uErr) throw new Error(uErr.message)
          for (const row of uRows ?? []) {
            if (!isRecord(row)) continue
            const title = str(row.display_name) || str(row.email) || ''
            const item = rowProfileToItem(row)
            if (item) items.push({ ...item, _rank: rankTextMatch(title, query) } as SearchItem & { _rank: number })
          }
        } else {
          const { data: selfRow } = await userClient
            .from('profiles')
            .select('id, display_name, email, role, updated_at')
            .eq('id', auth.userId)
            .maybeSingle()
          if (isRecord(selfRow)) {
            const title = str(selfRow.display_name) || str(selfRow.email) || ''
            if (!query || rankTextMatch(title, query) >= 60 || rankTextMatch(str(selfRow.email) ?? '', query) >= 60) {
              const item = rowProfileToItem(selfRow)
              if (item) items.push({ ...item, _rank: 50 } as SearchItem & { _rank: number })
            }
          }
        }
      }

      items.sort((a, b) => {
        const ra = a._rank ?? 0
        const rb = b._rank ?? 0
        if (rb !== ra) return rb - ra
        const ta = a.updatedAt ?? ''
        const tb = b.updatedAt ?? ''
        return tb.localeCompare(ta)
      })

      const stripped: SearchItem[] = items.map(({ _rank: _r, ...rest }) => rest)
      const total = stripped.length
      const start = (page - 1) * pageSize
      const pageItems = stripped.slice(start, start + pageSize)

      return json({
        data: {
          data: pageItems,
          count: total,
        },
      })
    }

    return json({ error: 'Unknown op' }, 400)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
