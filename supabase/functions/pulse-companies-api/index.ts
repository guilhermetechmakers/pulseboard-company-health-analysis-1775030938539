/**
 * PulseBoard — Company CRUD (single-company-per-user), onboarding drafts, completeness,
 * admin duplicate detection / merge (legacy repair), telemetry listing.
 * Auth: Bearer JWT. User ops validated by user id; admin ops require profiles.role = admin.
 * Maps to product REST surface via JSON body `{ op, ... }`.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => (typeof x === 'string' ? x : String(x))).filter((s) => s.trim().length > 0)
}

async function requireUser(
  supabaseUrl: string,
  anon: string,
  authHeader: string,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) }
  }
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anon)
  const jwt = authHeader.slice(7)
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) }
  }
  return { ok: true, userId: data.user.id }
}

async function requireAdmin(
  supabaseUrl: string,
  serviceKey: string,
  authHeader: string,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const base = await requireUser(supabaseUrl, serviceKey, authHeader)
  if (!base.ok) return base
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: prof, error } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', base.userId)
    .maybeSingle()
  if (error || !prof || prof.role !== 'admin' || prof.account_status === 'suspended') {
    return { ok: false, response: json({ error: 'Forbidden' }, 403) }
  }
  return { ok: true, userId: base.userId }
}

function computeCompletenessFromPayload(payload: Record<string, unknown>): {
  percent: number
  filled: number
  total: number
} {
  const fields: (string | string[])[] = [
    'name',
    'industry',
    'website',
    'business_model',
    'target_customers',
    ['products_services', 'products'],
    'revenue',
    'expenses',
    'competitors',
    'followers',
  ]
  let filled = 0
  for (const f of fields) {
    if (typeof f === 'string') {
      const v = payload[f]
      if (f === 'competitors' && Array.isArray(v) && v.length > 0) filled++
      else if (typeof v === 'string' && v.trim().length > 0) filled++
      else if (typeof v === 'number' && Number.isFinite(v)) filled++
      else if (Array.isArray(v) && v.length > 0) filled++
    } else {
      const a = payload[f[0]]
      const b = payload[f[1]]
      const ok =
        (Array.isArray(a) && a.length > 0) ||
        (typeof b === 'string' && b.trim().length > 0)
      if (ok) filled++
    }
  }
  const total = fields.length
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100)
  return { percent, filled, total }
}

async function logAudit(
  admin: ReturnType<typeof createClient>,
  actorId: string | null,
  action: string,
  metadata: Record<string, unknown>,
) {
  try {
    await admin.from('audit_logs').insert({
      actor_user_id: actorId,
      action,
      entity: 'company',
      entity_id: null,
      metadata,
      notes: null,
    })
  } catch {
    /* best-effort */
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const admin = createClient(supabaseUrl, serviceKey)

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await req.json()
    body = isRecord(raw) ? raw : {}
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const op = typeof body.op === 'string' ? body.op : ''

  if (op === 'telemetry_append') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const eventType = str(body.eventType)
    if (!eventType || eventType.length > 120) {
      return json({ error: { code: 'VALIDATION', message: 'eventType required (max 120 chars)' } }, 422)
    }
    const payload = isRecord(body.payload) ? body.payload : {}
    const { error } = await admin.from('telemetry_events').insert({
      user_id: u.userId,
      event_type: eventType,
      payload,
    })
    if (error) {
      return json({ error: { code: 'INSERT_FAILED', message: error.message } }, 500)
    }
    return json({ data: { ok: true } })
  }

  if (op === 'telemetry_list') {
    const a = await requireAdmin(supabaseUrl, serviceKey, authHeader)
    if (!a.ok) return a.response
    const limit = Math.min(200, Math.max(1, num(body.limit, 50)))
    const { data, error } = await admin
      .from('telemetry_events')
      .select('id, user_id, event_type, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return json({ error: error.message }, 500)
    return json({ data: { events: Array.isArray(data) ? data : [] } })
  }

  if (op === 'completeness') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const draft = isRecord(body.draft) ? body.draft : {}
    return json({ data: computeCompletenessFromPayload(draft) })
  }

  if (op === 'create') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const name = str(body.name).trim()
    if (!name) {
      return json(
        {
          error: {
            code: 'VALIDATION',
            message: 'Company name is required',
            remediation: 'Enter a company name to continue.',
          },
        },
        422,
      )
    }
    const { data: existing } = await admin.from('companies').select('id').eq('user_id', u.userId).maybeSingle()
    if (existing?.id) {
      return json(
        {
          error: {
            code: 'COMPANY_ALREADY_EXISTS',
            message: 'You already have an active company on PulseBoard.',
            remediation: 'Open your company workspace, or delete the existing company from settings before creating a new one.',
            existingCompanyId: existing.id,
          },
        },
        409,
      )
    }
    const productsServices = strArr(body.products_services)
    const insert = {
      user_id: u.userId,
      name,
      industry: str(body.industry).trim() || null,
      stage: str(body.stage).trim() || null,
      website: str(body.website).trim() || null,
      business_model: str(body.business_model).trim() || null,
      target_customers: str(body.target_customers).trim() || null,
      target_customer: str(body.target_customers).trim() || str(body.target_customer).trim() || null,
      goals: str(body.goals).trim() || null,
      products: Array.isArray(productsServices) && productsServices.length > 0 ? productsServices.join('\n') : null,
      products_services: productsServices,
      onboarding_complete: true,
      health_scores: {},
      search_tags: [] as string[],
    }
    const { data: company, error } = await admin.from('companies').insert(insert).select().single()
    if (error) {
      if (error.code === '23505') {
        return json(
          {
            error: {
              code: 'COMPANY_ALREADY_EXISTS',
              message: 'A company already exists for this account.',
              remediation: 'Use the company workspace to edit your profile.',
            },
          },
          409,
        )
      }
      return json({ error: { code: 'CREATE_FAILED', message: error.message } }, 500)
    }
    const companyId = company?.id as string
    const revenue = num(body.revenue, NaN)
    const expenses = num(body.expenses, NaN)
    const profit = num(body.profit, NaN)
    const cash = num(body.cash, NaN)
    const debt = num(body.debt, NaN)
    if (companyId && (!Number.isNaN(revenue) || !Number.isNaN(expenses) || !Number.isNaN(profit))) {
      await admin.from('company_financials').upsert({
        company_id: companyId,
        revenue: Number.isNaN(revenue) ? null : revenue,
        expenses: Number.isNaN(expenses) ? null : expenses,
        profit: Number.isNaN(profit) ? null : profit,
        cash: Number.isNaN(cash) ? null : cash,
        debt: Number.isNaN(debt) ? null : debt,
        updated_at: new Date().toISOString(),
      })
    }
    const competitors = strArr(body.competitors)
    const trends = strArr(body.trends)
    if (companyId && (competitors.length > 0 || trends.length > 0)) {
      await admin.from('company_market_data').upsert({
        company_id: companyId,
        competitors,
        trends,
        pricing_matrix: [],
        opportunities: [],
        threats: [],
        updated_at: new Date().toISOString(),
      })
    }
    const followers = num(body.followers, NaN)
    const engagement = num(body.engagement_rate, NaN)
    const posts = num(body.posts_count, NaN)
    const traffic = num(body.website_traffic, NaN)
    if (companyId && (!Number.isNaN(followers) || !Number.isNaN(engagement))) {
      await admin.from('company_social').upsert({
        company_id: companyId,
        followers: Number.isNaN(followers) ? null : followers,
        engagement_rate: Number.isNaN(engagement) ? null : engagement,
        posts_count: Number.isNaN(posts) ? null : posts,
        website_traffic: Number.isNaN(traffic) ? null : traffic,
        updated_at: new Date().toISOString(),
      })
    }
    await admin.from('onboarding_drafts').delete().eq('user_id', u.userId)
    await logAudit(admin, u.userId, 'company_created', { companyId })
    return json({ data: { company } }, 201)
  }

  if (op === 'me_get') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const { data, error } = await admin.from('companies').select('*').eq('user_id', u.userId).maybeSingle()
    if (error) return json({ error: error.message }, 500)
    return json({ data: { company: data ?? null } })
  }

  if (op === 'me_patch') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const { data: row } = await admin.from('companies').select('id').eq('user_id', u.userId).maybeSingle()
    if (!row?.id) return json({ error: { code: 'NOT_FOUND', message: 'No company for user' } }, 404)
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string') patch.name = body.name
    if (typeof body.industry === 'string') patch.industry = body.industry || null
    if (typeof body.stage === 'string') patch.stage = body.stage || null
    if (typeof body.website === 'string') patch.website = body.website || null
    if (typeof body.business_model === 'string') patch.business_model = body.business_model || null
    if (typeof body.goals === 'string') patch.goals = body.goals || null
    if (typeof body.target_customers === 'string') {
      patch.target_customers = body.target_customers || null
      patch.target_customer = body.target_customers || null
    }
    if (typeof body.target_customer === 'string' && patch.target_customers === undefined) {
      patch.target_customer = body.target_customer || null
    }
    if (Array.isArray(body.products_services)) {
      patch.products_services = strArr(body.products_services)
      const ps = strArr(body.products_services)
      patch.products = ps.length > 0 ? ps.join('\n') : null
    }
    if (typeof body.products === 'string' && patch.products === undefined) {
      patch.products = body.products || null
    }
    if (typeof body.onboarding_complete === 'boolean') patch.onboarding_complete = body.onboarding_complete
    const { data, error } = await admin.from('companies').update(patch).eq('id', row.id).select().single()
    if (error) return json({ error: error.message }, 500)
    await logAudit(admin, u.userId, 'company_updated', { companyId: row.id, fields: Object.keys(patch) })
    return json({ data: { company: data } })
  }

  if (op === 'me_delete') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const { data: row } = await admin.from('companies').select('id').eq('user_id', u.userId).maybeSingle()
    if (!row?.id) return json({ error: { code: 'NOT_FOUND', message: 'No company to delete' } }, 404)
    const { error } = await admin.from('companies').delete().eq('id', row.id)
    if (error) return json({ error: error.message }, 500)
    await admin.from('onboarding_drafts').delete().eq('user_id', u.userId)
    await logAudit(admin, u.userId, 'company_deleted', { companyId: row.id })
    return json({ data: { ok: true } })
  }

  if (op === 'draft_upsert') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const step = Math.min(5, Math.max(1, num(body.step, 1)))
    const data = isRecord(body.data) ? body.data : {}
    const { data: draft, error } = await admin
      .from('onboarding_drafts')
      .upsert(
        {
          user_id: u.userId,
          data,
          step,
          last_saved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)
    return json({ data: { draft } })
  }

  if (op === 'draft_get') {
    const u = await requireUser(supabaseUrl, anon, authHeader)
    if (!u.ok) return u.response
    const { data, error } = await admin.from('onboarding_drafts').select('*').eq('user_id', u.userId).maybeSingle()
    if (error) return json({ error: error.message }, 500)
    return json({ data: { draft: data ?? null } })
  }

  return json({ error: { code: 'UNKNOWN_OP', message: `Unknown op: ${op}` } }, 400)
})
