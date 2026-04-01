/**
 * PulseBoard — analyses API: create job + async process (service-role self-invoke), poll status (GET/POST).
 * Mirrors POST /api/analyses, GET /api/analyses/:id.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
import { runCompanyHealthAnalysis } from '../_shared/company-health-analysis-runner.ts'
import { createInAppNotification } from '../_shared/pulseboard-notifications.ts'

const createBodySchema = z
  .object({
    op: z.enum(['create']).optional(),
    companyId: z.string().uuid(),
    depth: z.enum(['brief', 'standard', 'deep']).default('standard'),
    includeBenchmarks: z.boolean().default(false),
    sendToEmail: z.boolean().default(false),
    email: z.string().email().optional().nullable(),
    consentGiven: z.boolean(),
  })
  .refine((d) => d.consentGiven === true, { message: 'consentGiven must be true' })
  .refine((d) => !d.sendToEmail || (typeof d.email === 'string' && z.string().email().safeParse(d.email).success), {
    message: 'Valid email is required when sendToEmail is true',
    path: ['email'],
  })

const processBodySchema = z.object({
  op: z.literal('process'),
  analysisId: z.string().uuid(),
})

type Supa = ReturnType<typeof createClient>

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function titlesFromRiskLike(rows: unknown, max: number): string[] {
  if (!Array.isArray(rows)) return []
  const out: string[] = []
  for (const r of rows) {
    if (typeof r === 'string' && r.trim()) {
      out.push(r.trim())
      continue
    }
    if (r !== null && typeof r === 'object' && 'title' in r) {
      const t = (r as { title?: unknown }).title
      if (typeof t === 'string' && t.trim()) out.push(t.trim())
    }
    if (out.length >= max) break
  }
  return out
}

async function buildCompletedAnalysisResults(
  supabase: Supa,
  reportId: string | null,
  payload: Record<string, unknown>,
): Promise<{
  executiveSummary: string
  swot: unknown
  financial: unknown
  market: unknown
  social: unknown
  risks: string[]
  opportunities: string[]
  actionPlan: unknown
}> {
  const execFromPayload = typeof payload.executiveSummary === 'string' ? payload.executiveSummary : ''
  const risksFromPayload = Array.isArray(payload.topRisks)
    ? payload.topRisks.filter((x): x is string => typeof x === 'string')
    : []
  const oppsFromPayload = Array.isArray(payload.topOpportunities)
    ? payload.topOpportunities.filter((x): x is string => typeof x === 'string')
    : []

  if (!reportId) {
    return {
      executiveSummary: execFromPayload,
      swot: null,
      financial: null,
      market: null,
      social: null,
      risks: risksFromPayload,
      opportunities: oppsFromPayload,
      actionPlan: null,
    }
  }

  const { data: rep, error: repErr } = await supabase
    .from('reports')
    .select('executive_summary, swot, financial_analysis, market_analysis, social_analysis, risks, opportunities, action_plan')
    .eq('id', reportId)
    .maybeSingle()

  if (repErr || !rep) {
    return {
      executiveSummary: execFromPayload,
      swot: null,
      financial: null,
      market: null,
      social: null,
      risks: risksFromPayload,
      opportunities: oppsFromPayload,
      actionPlan: null,
    }
  }

  const r = rep as Record<string, unknown>
  const exec =
    typeof r.executive_summary === 'string' && r.executive_summary.trim() ? r.executive_summary : execFromPayload
  const swot = r.swot !== null && typeof r.swot === 'object' && !Array.isArray(r.swot) ? r.swot : null
  const financial = typeof r.financial_analysis === 'string' ? r.financial_analysis : null
  const market = typeof r.market_analysis === 'string' ? r.market_analysis : null
  const social = typeof r.social_analysis === 'string' ? r.social_analysis : null
  const riskTitles = titlesFromRiskLike(r.risks, 80)
  const oppTitles = titlesFromRiskLike(r.opportunities, 80)
  const actionPlan = r.action_plan ?? null

  return {
    executiveSummary: typeof exec === 'string' ? exec.slice(0, 4000) : '',
    swot,
    financial,
    market,
    social,
    risks: riskTitles.length > 0 ? riskTitles : risksFromPayload,
    opportunities: oppTitles.length > 0 ? oppTitles : oppsFromPayload,
    actionPlan,
  }
}

async function appendJobLog(client: Supa, jobId: string, line: string): Promise<void> {
  const ts = new Date().toISOString()
  const entry = `${ts}  ${line}`
  const { data: row } = await client.from('analysis_jobs').select('logs').eq('id', jobId).maybeSingle()
  const prev = asStringArray(row?.logs)
  const next = [...prev, entry].slice(-200)
  await client.from('analysis_jobs').update({ logs: next, updated_at: ts }).eq('id', jobId)
}

async function patchJob(client: Supa, jobId: string, patch: Record<string, unknown>): Promise<void> {
  await client
    .from('analysis_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function processAnalysisJobServiceRole(params: { supabaseUrl: string; serviceKey: string; analysisId: string }): Promise<void> {
  const admin = createClient(params.supabaseUrl, params.serviceKey)
  await processAnalysisJob({
    supabaseUrl: params.supabaseUrl,
    db: admin,
    analysisId: params.analysisId,
    useAdminUserLookup: true,
  })
}

async function processAnalysisJob(params: {
  supabaseUrl: string
  db: Supa
  analysisId: string
  useAdminUserLookup: boolean
}): Promise<void> {
  const { supabaseUrl, db, analysisId, useAdminUserLookup } = params
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

  if (!openAiKey) {
    await patchJob(db, analysisId, {
      status: 'failed',
      progress: 100,
      error_message: 'missing_openai_key',
      completed_at: new Date().toISOString(),
    })
    await appendJobLog(db, analysisId, 'ERROR: Server misconfigured (OPENAI_API_KEY)')
    return
  }

  const { data: job, error: jobErr } = await db.from('analysis_jobs').select('*').eq('id', analysisId).maybeSingle()

  if (jobErr || !job) {
    return
  }

  const companyId = typeof job.company_id === 'string' ? job.company_id : ''
  const userId = typeof job.user_id === 'string' ? job.user_id : ''
  const depth = job.depth === 'brief' || job.depth === 'deep' || job.depth === 'standard' ? job.depth : 'standard'
  const benchmarking = Boolean(job.include_benchmarks)
  const consent = Boolean(job.consent_given)
  const sendToEmail = Boolean(job.send_to_email)
  const emailOverride =
    typeof job.email === 'string' && job.email.includes('@') && sendToEmail ? job.email.trim() : null

  await patchJob(db, analysisId, { status: 'running', progress: 2 })
  await appendJobLog(db, analysisId, 'Job picked up by analysis worker')

  let actor: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }

  if (useAdminUserLookup) {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceKey) {
      await patchJob(db, analysisId, {
        status: 'failed',
        progress: 100,
        error_message: 'service_role_missing',
        completed_at: new Date().toISOString(),
      })
      return
    }
    const adminAuth = createClient(supabaseUrl, serviceKey)
    const { data: userData, error: userErr } = await adminAuth.auth.admin.getUserById(userId)
    if (userErr || !userData?.user) {
      await patchJob(db, analysisId, {
        status: 'failed',
        progress: 100,
        error_message: 'user_not_found',
        completed_at: new Date().toISOString(),
      })
      await appendJobLog(db, analysisId, 'ERROR: User not found for job')
      return
    }
    const u = userData.user
    actor = {
      id: u.id,
      email: u.email,
      user_metadata: u.user_metadata as Record<string, unknown> | null,
    }
  } else {
    const {
      data: { user: sessionUser },
      error: suErr,
    } = await db.auth.getUser()
    if (suErr || !sessionUser || sessionUser.id !== userId) {
      await patchJob(db, analysisId, {
        status: 'failed',
        progress: 100,
        error_message: 'session_mismatch',
        completed_at: new Date().toISOString(),
      })
      await appendJobLog(db, analysisId, 'ERROR: Session does not match job owner')
      return
    }
    actor = {
      id: sessionUser.id,
      email: sessionUser.email,
      user_metadata: sessionUser.user_metadata as Record<string, unknown> | null,
    }
  }

  const result = await runCompanyHealthAnalysis({
    db,
    supabaseUrl,
    openAiKey,
    model,
    actor,
    companyId,
    analysisDepth: depth,
    benchmarking,
    consent,
    reportEmailOverride: emailOverride,
    onProgress: async (pct, line) => {
      await patchJob(db, analysisId, { progress: pct })
      await appendJobLog(db, analysisId, line)
    },
  })

  if (!result.ok) {
    await patchJob(db, analysisId, {
      status: 'failed',
      progress: 100,
      error_message: result.error,
      report_id: result.reportId || null,
      completed_at: new Date().toISOString(),
    })
    const errMsg = typeof result.error === 'string' && result.error.trim() ? result.error.trim() : 'Analysis failed'
    if (!result.reportId) {
      try {
        await createInAppNotification(db, {
          userId,
          type: 'job_failed',
          message: `Analysis could not run: ${errMsg}`,
          data: { analysisId, companyId },
        })
      } catch {
        /* non-blocking */
      }
    }
    return
  }

  const { data: rep } = await db
    .from('reports')
    .select('executive_summary, risks, opportunities')
    .eq('id', result.reportId)
    .maybeSingle()

  const summary = typeof rep?.executive_summary === 'string' ? rep.executive_summary.slice(0, 560) : ''
  const topRisks = titlesFromRiskLike(rep?.risks, 4)
  const topOpportunities = titlesFromRiskLike(rep?.opportunities, 4)

  await patchJob(db, analysisId, {
    status: 'completed',
    progress: 100,
    report_id: result.reportId,
    completed_at: new Date().toISOString(),
    result_payload: {
      executiveSummary: summary,
      topRisks,
      topOpportunities,
      reportId: result.reportId,
      analysisDepth: result.analysisDepth,
      sourceModel: result.sourceModel,
    },
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  try {
    let postJson: unknown = null
    if (req.method === 'POST') {
      const raw = await req.text()
      if (raw) {
        try {
          postJson = JSON.parse(raw)
        } catch {
          postJson = null
        }
      }
    }

    /** Internal worker: service role JWT */
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization') ?? ''
      const parsedProcess = processBodySchema.safeParse(postJson)
      if (parsedProcess.success && serviceKey && authHeader === `Bearer ${serviceKey}`) {
        await processAnalysisJobServiceRole({
          supabaseUrl,
          serviceKey,
          analysisId: parsedProcess.data.analysisId,
        })
        return json({ data: { ok: true } })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    /** GET ?analysisId= — poll status */
    if (req.method === 'GET') {
      const u = new URL(req.url)
      const analysisId = u.searchParams.get('analysisId') ?? u.searchParams.get('id')
      if (!analysisId || !z.string().uuid().safeParse(analysisId).success) {
        return json({ error: 'analysisId query required' }, 400)
      }
      const { data: job, error: jErr } = await supabase.from('analysis_jobs').select('*').eq('id', analysisId).maybeSingle()
      if (jErr || !job) {
        return json({ error: 'Not found' }, 404)
      }
      const logs = asStringArray(job.logs)
      const payload =
        job.result_payload !== null && typeof job.result_payload === 'object' && !Array.isArray(job.result_payload)
          ? (job.result_payload as Record<string, unknown>)
          : {}

      const rid = typeof job.report_id === 'string' ? job.report_id : null
      const results =
        job.status === 'completed'
          ? await buildCompletedAnalysisResults(supabase, rid, payload)
          : undefined

      return json({
        data: {
          analysisId: job.id,
          status: job.status,
          progress: typeof job.progress === 'number' ? job.progress : 0,
          logs,
          startedAt: job.started_at,
          completedAt: job.completed_at ?? null,
          reportId: rid,
          results,
          error: typeof job.error_message === 'string' ? job.error_message : null,
        },
      })
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const parsed = createBodySchema.safeParse(postJson)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400)
    }

    const { companyId, depth, includeBenchmarks, sendToEmail, email, consentGiven } = parsed.data

    const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
    if (scopeBlock) return scopeBlock

    const { data: company, error: cErr } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (cErr || !company) {
      return json({ error: 'Company not found or access denied' }, 404)
    }

    const startedAt = new Date().toISOString()

    const { data: inserted, error: insErr } = await supabase
      .from('analysis_jobs')
      .insert({
        company_id: companyId,
        user_id: user.id,
        depth,
        include_benchmarks: includeBenchmarks,
        consent_given: consentGiven,
        send_to_email: sendToEmail,
        email: sendToEmail && email ? email : null,
        status: 'queued',
        progress: 0,
        started_at: startedAt,
        logs: [`${startedAt}  Job queued`],
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      return json({ error: insErr?.message ?? 'Failed to create analysis job' }, 500)
    }

    const analysisId = inserted.id as string

    if (serviceKey) {
      const processUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/pulse-analyses-api`
      fetch(processUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ op: 'process', analysisId }),
      }).catch(() => {
        /* worker may still be invoked manually */
      })
    } else {
      await processAnalysisJob({
        supabaseUrl,
        db: supabase,
        analysisId,
        useAdminUserLookup: false,
      })
    }

    return json({
      data: {
        analysisId,
        status: 'queued',
        startedAt,
        progress: 0,
      },
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
