/**
 * PulseBoard — cacheable reads for company workspace data with in-memory TTL and invalidation.
 * Mirrors REST-style resources: profile aggregate, health scores, analyses list, full report.
 * Keys: company:<id>:profile, company:<id>:health:<scope>, company:<id>:analyses, analysis:<reportId>:summary
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import {
  ttlCacheDeleteKey,
  ttlCacheDeletePrefix,
  ttlCacheGet,
  ttlCacheSet,
  ttlCacheSize,
} from '../_shared/ttl-cache.ts'

const TTL_PROFILE_MS = 90_000
const TTL_HEALTH_MS = 45_000
const TTL_ANALYSES_MS = 60_000
const TTL_REPORT_MS = 120_000

const requestSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('get_company_profile'),
    companyId: z.string().uuid(),
    bustCache: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('get_company_health'),
    companyId: z.string().uuid(),
    analysisId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    bustCache: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('get_company_analyses'),
    companyId: z.string().uuid(),
    bustCache: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('get_report'),
    reportId: z.string().uuid(),
    bustCache: z.boolean().optional(),
  }),
  z.object({
    op: z.literal('invalidate_company'),
    companyId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('invalidate_report'),
    reportId: z.string().uuid(),
    companyId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('cache_stats'),
  }),
])

type ProfileBundle = {
  financials: Record<string, unknown> | null
  analytics: Record<string, unknown> | null
  social: Record<string, unknown> | null
  billing: Record<string, unknown> | null
  market: Record<string, unknown> | null
  latestReport: Record<string, unknown> | null
}

function envelope<T>(
  data: T,
  source: 'cache' | 'origin',
  ttlSeconds: number,
  cacheHit: boolean,
  cachedAt: string | null,
) {
  return {
    data,
    error: null as string | null,
    meta: {
      cacheHit,
      source,
      cachedAt,
      ttlSeconds,
    },
  }
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ data: null, error: message, meta: null }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function assertCompanyAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return data !== null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('Unauthorized', 401)
    }

    const jsonBody = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(jsonBody)
    if (!parsed.success) {
      return errorResponse('Invalid request', 400)
    }

    const body = parsed.data

    if (body.op === 'cache_stats') {
      return new Response(
        JSON.stringify({
          data: { entries: ttlCacheSize() },
          error: null,
          meta: { cacheHit: false, source: 'origin' as const, cachedAt: null, ttlSeconds: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.op === 'invalidate_company') {
      const ok = await assertCompanyAccess(supabase, user.id, body.companyId)
      if (!ok) return errorResponse('Company not found or access denied', 404)
      const n = ttlCacheDeletePrefix(`company:${body.companyId}:`)
      return new Response(
        JSON.stringify({
          data: { cleared: n },
          error: null,
          meta: { cacheHit: false, source: 'origin' as const, cachedAt: null, ttlSeconds: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.op === 'invalidate_report') {
      ttlCacheDeleteKey(`analysis:${body.reportId}:summary`)
      if (body.companyId) {
        ttlCacheDeletePrefix(`company:${body.companyId}:`)
      }
      return new Response(
        JSON.stringify({
          data: { ok: true },
          error: null,
          meta: { cacheHit: false, source: 'origin' as const, cachedAt: null, ttlSeconds: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.op === 'get_company_profile') {
      const ok = await assertCompanyAccess(supabase, user.id, body.companyId)
      if (!ok) return errorResponse('Company not found or access denied', 404)

      const cacheKey = `company:${body.companyId}:profile`
      if (!body.bustCache) {
        const hit = ttlCacheGet<ProfileBundle>(cacheKey)
        if (hit) {
          return new Response(JSON.stringify(envelope(hit, 'cache', TTL_PROFILE_MS / 1000, true, new Date().toISOString())), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        ttlCacheDeleteKey(cacheKey)
      }

      const [fin, ana, soc, bill, mkt, rep] = await Promise.all([
        supabase.from('company_financials').select('*').eq('company_id', body.companyId).maybeSingle(),
        supabase.from('company_analytics').select('*').eq('company_id', body.companyId).maybeSingle(),
        supabase.from('company_social').select('*').eq('company_id', body.companyId).maybeSingle(),
        supabase.from('company_billing').select('*').eq('company_id', body.companyId).maybeSingle(),
        supabase.from('company_market_data').select('*').eq('company_id', body.companyId).maybeSingle(),
        supabase
          .from('reports')
          .select('*')
          .eq('company_id', body.companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const bundle: ProfileBundle = {
        financials: (fin.data ?? null) as Record<string, unknown> | null,
        analytics: (ana.data ?? null) as Record<string, unknown> | null,
        social: (soc.data ?? null) as Record<string, unknown> | null,
        billing: (bill.data ?? null) as Record<string, unknown> | null,
        market: (mkt.data ?? null) as Record<string, unknown> | null,
        latestReport: (rep.data ?? null) as Record<string, unknown> | null,
      }

      ttlCacheSet(cacheKey, bundle, TTL_PROFILE_MS)
      const now = new Date().toISOString()
      return new Response(JSON.stringify(envelope(bundle, 'origin', TTL_PROFILE_MS / 1000, false, now)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.op === 'get_company_health') {
      const ok = await assertCompanyAccess(supabase, user.id, body.companyId)
      if (!ok) return errorResponse('Company not found or access denied', 404)

      const limit = body.limit ?? 24
      const scopeKey = body.analysisId ? `analysis:${body.analysisId}` : `list:${limit}`
      const cacheKey = `company:${body.companyId}:health:${scopeKey}`

      if (!body.bustCache) {
        const hit = ttlCacheGet<unknown[]>(cacheKey)
        if (hit && Array.isArray(hit)) {
          return new Response(JSON.stringify(envelope(hit, 'cache', TTL_HEALTH_MS / 1000, true, new Date().toISOString())), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        ttlCacheDeleteKey(cacheKey)
      }

      let q = supabase
        .from('company_health_scores')
        .select('*')
        .eq('company_id', body.companyId)
        .order('scored_at', { ascending: false })
        .limit(limit)

      if (body.analysisId) {
        q = q.eq('report_id', body.analysisId)
      }

      const { data, error } = await q
      if (error) return errorResponse(error.message, 500)
      const rows = Array.isArray(data) ? data : []

      ttlCacheSet(cacheKey, rows, TTL_HEALTH_MS)
      const now = new Date().toISOString()
      return new Response(JSON.stringify(envelope(rows, 'origin', TTL_HEALTH_MS / 1000, false, now)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.op === 'get_company_analyses') {
      const ok = await assertCompanyAccess(supabase, user.id, body.companyId)
      if (!ok) return errorResponse('Company not found or access denied', 404)

      const cacheKey = `company:${body.companyId}:analyses`
      if (!body.bustCache) {
        const hit = ttlCacheGet<unknown[]>(cacheKey)
        if (hit && Array.isArray(hit)) {
          return new Response(JSON.stringify(envelope(hit, 'cache', TTL_ANALYSES_MS / 1000, true, new Date().toISOString())), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        ttlCacheDeleteKey(cacheKey)
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('company_id', body.companyId)
        .order('created_at', { ascending: false })

      if (error) return errorResponse(error.message, 500)
      const rows = Array.isArray(data) ? data : []

      ttlCacheSet(cacheKey, rows, TTL_ANALYSES_MS)
      const now = new Date().toISOString()
      return new Response(JSON.stringify(envelope(rows, 'origin', TTL_ANALYSES_MS / 1000, false, now)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.op === 'get_report') {
      const { data: report, error: repErr } = await supabase.from('reports').select('*').eq('id', body.reportId).maybeSingle()
      if (repErr) return errorResponse(repErr.message, 500)
      if (!report) return errorResponse('Report not found', 404)

      const companyId = report.company_id as string
      const ok = await assertCompanyAccess(supabase, user.id, companyId)
      if (!ok) return errorResponse('Access denied', 403)

      const cacheKey = `analysis:${body.reportId}:summary`
      if (!body.bustCache) {
        const hit = ttlCacheGet<Record<string, unknown>>(cacheKey)
        if (hit && typeof hit === 'object') {
          return new Response(JSON.stringify(envelope(hit, 'cache', TTL_REPORT_MS / 1000, true, new Date().toISOString())), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        ttlCacheDeleteKey(cacheKey)
      }

      const row = report as Record<string, unknown>
      ttlCacheSet(cacheKey, row, TTL_REPORT_MS)
      const now = new Date().toISOString()
      return new Response(JSON.stringify(envelope(row, 'origin', TTL_REPORT_MS / 1000, false, now)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return errorResponse('Unsupported operation', 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return errorResponse(msg, 500)
  }
})
