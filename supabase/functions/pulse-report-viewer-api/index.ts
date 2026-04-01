/**
 * PulseBoard — Report Viewer API: section writes, snapshots, health read, TTL cache rows, snapshot restore.
 * Validates JWT + company ownership (reports → companies). Mirrors `PulseReportViewerBody` in the SPA.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
import { asRecord } from '../_shared/safe-json.ts'

const MAX_SECTION_CHARS = 500_000
const MAX_LABEL = 200
const MAX_NOTES = 4000

const sectionKeySchema = z.enum(['executive_summary', 'financial_analysis', 'market_analysis', 'social_analysis'])

const requestSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('get_report_bundle'),
    reportId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('update_section'),
    reportId: z.string().uuid(),
    sectionKey: sectionKeySchema,
    content: z.string().max(MAX_SECTION_CHARS),
  }),
  z.object({
    op: z.literal('create_snapshot'),
    reportId: z.string().uuid(),
    label: z.string().min(1).max(MAX_LABEL),
    notes: z.string().max(MAX_NOTES).optional(),
    sections: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal('get_health'),
    reportId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('cache_get'),
    reportId: z.string().uuid(),
    cacheKey: z.string().min(1).max(200),
  }),
  z.object({
    op: z.literal('cache_set'),
    reportId: z.string().uuid(),
    cacheKey: z.string().min(1).max(200),
    value: z.record(z.unknown()),
    ttlSeconds: z.number().int().min(30).max(86_400).optional(),
  }),
  z.object({
    op: z.literal('cache_delete'),
    reportId: z.string().uuid(),
    cacheKey: z.string().min(1).max(200),
  }),
  z.object({
    op: z.literal('restore_snapshot'),
    reportId: z.string().uuid(),
    snapshotId: z.string().uuid(),
  }),
])

async function assertReportAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reportId: string,
): Promise<{ companyId: string } | null> {
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, company_id')
    .eq('id', reportId)
    .maybeSingle()
  if (error || !report) return null
  const companyId = typeof report.company_id === 'string' ? report.company_id : ''
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!company) return null
  return { companyId }
}

function jsonOk(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonErr(message: string, status: number) {
  return new Response(JSON.stringify({ data: null, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseSwotJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.length > MAX_SECTION_CHARS) return null
  try {
    const v = JSON.parse(raw) as unknown
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return null
    return v as Record<string, unknown>
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonErr('Method not allowed', 405)
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
      return jsonErr('Unauthorized', 401)
    }

    const jsonBody = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(jsonBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ data: null, error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = parsed.data

    if (body.op === 'get_report_bundle') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const { data: report, error: rErr } = await supabase.from('reports').select('*').eq('id', body.reportId).maybeSingle()
      if (rErr || !report) return jsonErr('Report not found', 404)

      const { data: health } = await supabase
        .from('company_health_scores')
        .select('*')
        .eq('report_id', body.reportId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return jsonOk({ report: asRecord(report as Record<string, unknown>), health: health ?? null })
    }

    if (body.op === 'update_section') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const patch: Record<string, unknown> = {
        [body.sectionKey]: body.content,
        updated_at: new Date().toISOString(),
      }
      const { error: upErr } = await supabase.from('reports').update(patch).eq('id', body.reportId)
      if (upErr) return jsonErr(upErr.message, 500)

      await supabase.from('report_section_contents').upsert(
        {
          report_id: body.reportId,
          section_key: body.sectionKey,
          content: body.content,
          edited_at: new Date().toISOString(),
          author_id: user.id,
        },
        { onConflict: 'report_id,section_key' },
      )

      await supabase.from('report_cache_entries').delete().eq('report_id', body.reportId)
      return jsonOk({ ok: true })
    }

    if (body.op === 'create_snapshot') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const { error: insErr } = await supabase.from('report_snapshots').insert({
        report_id: body.reportId,
        label: body.label,
        notes: body.notes ?? null,
        sections: body.sections as Record<string, unknown>,
        created_by: user.id,
      })
      if (insErr) return jsonErr(insErr.message, 500)
      return jsonOk({ ok: true })
    }

    if (body.op === 'get_health') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const { data: row } = await supabase
        .from('company_health_scores')
        .select('*')
        .eq('report_id', body.reportId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: rep } = await supabase.from('reports').select('health_scores').eq('id', body.reportId).maybeSingle()
      const emb = rep?.health_scores
      const embedded =
        emb !== null && typeof emb === 'object' && !Array.isArray(emb) ? (emb as Record<string, unknown>) : {}

      return jsonOk({ row: row ?? null, embedded })
    }

    if (body.op === 'cache_get') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)

      const { data: entry } = await supabase
        .from('report_cache_entries')
        .select('value, expires_at')
        .eq('report_id', body.reportId)
        .eq('cache_key', body.cacheKey)
        .maybeSingle()

      if (!entry) return jsonOk({ hit: false, value: null })
      const exp = typeof entry.expires_at === 'string' ? Date.parse(entry.expires_at) : NaN
      if (!Number.isFinite(exp) || Date.now() > exp) {
        await supabase.from('report_cache_entries').delete().eq('report_id', body.reportId).eq('cache_key', body.cacheKey)
        return jsonOk({ hit: false, value: null })
      }
      return jsonOk({ hit: true, value: entry.value })
    }

    if (body.op === 'cache_set') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const ttl = body.ttlSeconds ?? 300
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
      const { error: cErr } = await supabase.from('report_cache_entries').upsert(
        {
          report_id: body.reportId,
          cache_key: body.cacheKey,
          value: body.value,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'report_id,cache_key' },
      )
      if (cErr) return jsonErr(cErr.message, 500)
      return jsonOk({ ok: true })
    }

    if (body.op === 'cache_delete') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      await supabase.from('report_cache_entries').delete().eq('report_id', body.reportId).eq('cache_key', body.cacheKey)
      return jsonOk({ ok: true })
    }

    if (body.op === 'restore_snapshot') {
      const acc = await assertReportAccess(supabase, user.id, body.reportId)
      if (!acc) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, acc.companyId)
      if (scopeBlock) return scopeBlock

      const { data: snap, error: snapErr } = await supabase
        .from('report_snapshots')
        .select('id, report_id, sections')
        .eq('id', body.snapshotId)
        .eq('report_id', body.reportId)
        .maybeSingle()

      if (snapErr || !snap) return jsonErr('Snapshot not found', 404)

      const sections = asRecord(snap.sections as Record<string, unknown>)
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

      const es = sections.executive_summary
      if (typeof es === 'string' && es.length <= MAX_SECTION_CHARS) update.executive_summary = es
      const fa = sections.financial_analysis
      if (typeof fa === 'string' && fa.length <= MAX_SECTION_CHARS) update.financial_analysis = fa
      const ma = sections.market_analysis
      if (typeof ma === 'string' && ma.length <= MAX_SECTION_CHARS) update.market_analysis = ma
      const sa = sections.social_analysis
      if (typeof sa === 'string' && sa.length <= MAX_SECTION_CHARS) update.social_analysis = sa
      const swotParsed = parseSwotJson(sections.swot_json)
      if (swotParsed) update.swot = swotParsed

      const { error: upErr } = await supabase.from('reports').update(update).eq('id', body.reportId)
      if (upErr) return jsonErr(upErr.message, 500)

      await supabase.from('report_cache_entries').delete().eq('report_id', body.reportId)

      const narrativeKeys = ['executive_summary', 'financial_analysis', 'market_analysis', 'social_analysis'] as const
      for (const key of narrativeKeys) {
        const v = update[key]
        if (typeof v === 'string') {
          await supabase.from('report_section_contents').upsert(
            {
              report_id: body.reportId,
              section_key: key,
              content: v,
              edited_at: new Date().toISOString(),
              author_id: user.id,
            },
            { onConflict: 'report_id,section_key' },
          )
        }
      }

      return jsonOk({ ok: true, reportId: body.reportId })
    }

    return jsonErr('Unsupported operation', 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return jsonErr(msg, 500)
  }
})
