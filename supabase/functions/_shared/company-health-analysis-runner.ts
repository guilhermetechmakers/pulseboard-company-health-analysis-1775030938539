/**
 * Shared PulseBoard company health LLM pipeline — used by analyze-company-health and pulse-analyses-api.
 * OpenAI + report persistence, health scores, notifications (optional email via service admin).
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { asArray, asRecord } from './safe-json.ts'
import { computeWeightedHealthScores, mergeLlmAndRuleScores } from './health-score-engine.ts'
import { createInAppNotification } from './pulseboard-notifications.ts'
import { sendDirectResendEmail, sendTemplatedEmailIfEnabled } from './transactional-email.ts'

const swotSchema = z.object({
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  threats: z.array(z.string()).default([]),
})

const riskItemSchema = z.object({
  title: z.string(),
  severity: z.string().optional(),
  detail: z.string().optional(),
})

const opportunityItemSchema = z.object({
  title: z.string(),
  impact: z.string().optional(),
  detail: z.string().optional(),
})

const actionItemSchema = z.object({
  priority: z.number().optional(),
  action: z.string(),
  rationale: z.string().optional(),
})

const analysisOutputSchema = z.object({
  executiveSummary: z.string().default(''),
  swot: swotSchema.default({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  }),
  financialAnalysis: z.string().default(''),
  marketAnalysis: z.string().default(''),
  socialAnalysis: z.string().default(''),
  risks: z.array(riskItemSchema).default([]),
  opportunities: z.array(opportunityItemSchema).default([]),
  actionPlan: z.array(actionItemSchema).default([]),
  healthScores: z
    .object({
      overall: z.number().min(0).max(100).optional(),
      financial: z.number().min(0).max(100).optional(),
      market: z.number().min(0).max(100).optional(),
      social: z.number().min(0).max(100).optional(),
    })
    .default({}),
})

export type AnalysisDepth = 'brief' | 'standard' | 'deep'

export type CompanyHealthAnalysisActor = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function truncateContext(json: string, maxChars: number): string {
  if (json.length <= maxChars) return json
  return `${json.slice(0, maxChars)}\n…[truncated]`
}

async function callOpenAiStructured(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
): Promise<{ parsed: z.infer<typeof analysisOutputSchema>; raw: Record<string, unknown>; usage: Record<string, unknown> }> {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.35,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const rawJson = asRecord(await res.json())
  if (!res.ok) {
    const errMsg =
      typeof rawJson.error === 'object' && rawJson.error !== null && 'message' in rawJson.error
        ? String((rawJson.error as { message?: string }).message)
        : `OpenAI HTTP ${res.status}`
    throw new Error(errMsg)
  }

  const choices = asArray<Record<string, unknown>>(rawJson.choices)
  const first = asRecord(choices[0])
  const message = asRecord(first.message)
  const content = typeof message.content === 'string' ? message.content : '{}'

  let obj: unknown
  try {
    obj = JSON.parse(content)
  } catch {
    throw new Error('Model returned non-JSON content')
  }

  const parsed = analysisOutputSchema.parse(obj)
  const usage = asRecord(rawJson.usage)

  return { parsed, raw: rawJson, usage }
}

async function callOpenAiWithRetry(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  maxAttempts = 3,
): Promise<{ parsed: z.infer<typeof analysisOutputSchema>; raw: Record<string, unknown>; usage: Record<string, unknown> }> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await callOpenAiStructured(apiKey, model, systemPrompt, userContent)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < maxAttempts - 1) {
        await sleep(2 ** attempt * 500)
      }
    }
  }
  throw lastError ?? new Error('OpenAI request failed')
}

export type RunCompanyHealthAnalysisResult =
  | { ok: true; reportId: string; analysisDepth: AnalysisDepth; sourceModel: string }
  | { ok: false; error: string; reportId: string }

function normalizeStoredLogs(raw: unknown): { t: string; m: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { t: string; m: string }[] = []
  for (const item of raw) {
    if (item !== null && typeof item === 'object' && 'm' in item && typeof (item as { m: unknown }).m === 'string') {
      const t = 't' in item && typeof (item as { t: unknown }).t === 'string' ? (item as { t: string }).t : ''
      out.push({ t, m: (item as { m: string }).m })
    }
  }
  return out
}

function asDepth(v: unknown): AnalysisDepth {
  if (v === 'brief' || v === 'standard' || v === 'deep') return v
  return 'standard'
}

export async function runCompanyHealthAnalysis(input: {
  db: SupabaseClient
  supabaseUrl: string
  openAiKey: string
  model: string
  actor: CompanyHealthAnalysisActor
  companyId: string
  analysisDepth: AnalysisDepth
  benchmarking: boolean
  consent: boolean
  /** Optional progress hook for async job UI (0–100). */
  onProgress?: (pct: number, line: string) => Promise<void>
  /** When set, analysis_complete email goes here (Generate Analysis “send to email”). */
  reportEmailOverride?: string | null
  /** Pre-created queued row from pulse-analyses-api start_analysis. */
  existingReportId?: string | null
}): Promise<RunCompanyHealthAnalysisResult> {
  const {
    db,
    supabaseUrl,
    openAiKey,
    model,
    actor,
    companyId,
    analysisDepth: inputDepth,
    benchmarking: inputBenchmarking,
    consent,
    onProgress,
    reportEmailOverride: inputEmailOverride,
    existingReportId,
  } = input

  const memoryLogs: { t: string; m: string }[] = []
  let reportId = ''
  let analysisDepth: AnalysisDepth = inputDepth
  let benchmarking = inputBenchmarking
  let consentIso = new Date().toISOString()
  let emailOverride: string | null = inputEmailOverride ?? null

  const persistJob = async (pct: number) => {
    if (!reportId) return
    await db
      .from('reports')
      .update({
        progress_percent: pct,
        analysis_logs: memoryLogs,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
  }

  const push = async (pct: number, line: string) => {
    memoryLogs.push({ t: new Date().toISOString(), m: line })
    if (onProgress) await onProgress(pct, line)
    await persistJob(pct)
  }

  await push(5, 'Validating company workspace')

  const { data: company, error: companyError } = await db
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', actor.id)
    .maybeSingle()

  if (companyError || !company) {
    return { ok: false, error: 'Company not found or access denied', reportId: '' }
  }

  if (existingReportId) {
    const { data: existing, error: exErr } = await db
      .from('reports')
      .select('*')
      .eq('id', existingReportId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (exErr || !existing) {
      return { ok: false, error: 'Analysis record not found', reportId: existingReportId }
    }

    const row = asRecord(existing as Record<string, unknown>)
    if (row.status !== 'queued') {
      return { ok: false, error: 'Analysis is not queued for execution', reportId: existingReportId }
    }

    reportId = existingReportId
    analysisDepth = asDepth(row.analysis_depth)
    benchmarking = Boolean(row.benchmarking_enabled)
    if (typeof row.consent_recorded_at === 'string') consentIso = row.consent_recorded_at

    memoryLogs.push(...normalizeStoredLogs(row.analysis_logs))

    if (emailOverride === null || emailOverride === undefined || emailOverride === '') {
      const send = Boolean(row.send_report_email)
      const addr = typeof row.report_email === 'string' ? row.report_email : ''
      if (send && addr.includes('@')) emailOverride = addr
    }

    await push(12, 'Queued job picked up; loading financial, market, and social context')
  } else {
    const { data: reportRow, error: insertError } = await db
      .from('reports')
      .insert({
        company_id: companyId,
        status: 'in_progress',
        initiated_by: actor.id,
        analysis_depth: analysisDepth,
        benchmarking_enabled: benchmarking,
        consent_recorded_at: consentIso,
        source_model: model,
        progress_percent: 0,
        analysis_logs: [],
        send_report_email: Boolean(emailOverride && emailOverride.includes('@')),
        report_email: emailOverride && emailOverride.includes('@') ? emailOverride : null,
        payload: {
          consent,
          benchmarking,
          analysisDepth,
          startedAt: consentIso,
        },
      })
      .select('id')
      .single()

    if (insertError || !reportRow) {
      return { ok: false, error: insertError?.message ?? 'Failed to create report', reportId: '' }
    }

    reportId = reportRow.id as string
    await push(12, 'Report draft created')
    await push(16, 'Loading financial, market, and social context')
  }

  const [finRes, marketRes, socialRes, analyticsRes] = await Promise.all([
    db.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
    db.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
    db.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
    db.from('company_analytics').select('*').eq('company_id', companyId).maybeSingle(),
  ])

  const context = {
    company: asRecord(company),
    financials: finRes.data ? asRecord(finRes.data) : {},
    market: marketRes.data ? asRecord(marketRes.data) : {},
    social: socialRes.data ? asRecord(socialRes.data) : {},
    analytics: analyticsRes.data ? asRecord(analyticsRes.data) : {},
  }

  const contextStr = truncateContext(JSON.stringify(context, null, 2), 14000)

  const depthInstructions: Record<AnalysisDepth, string> = {
    brief: 'Keep each narrative section to 2-3 short paragraphs. Limit lists to top 3 items where applicable.',
    standard: 'Use moderate detail: 3-5 paragraphs for major narratives, up to 5 items per list.',
    deep: 'Provide thorough analysis with specifics, tradeoffs, and up to 8 items per list where helpful.',
  }

  const benchmarkNote = benchmarking
    ? 'Assume SMB / generic industry benchmarks where data is missing; call out uncertainty explicitly.'
    : 'Do not invent peer benchmarks; ground statements in provided data only.'

  const systemPrompt = `You are PulseBoard's company health analyst. Output a single JSON object matching this shape exactly (no markdown fences):
{
  "executiveSummary": string,
  "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "financialAnalysis": string,
  "marketAnalysis": string,
  "socialAnalysis": string,
  "risks": [{ "title": string, "severity"?: string, "detail"?: string }],
  "opportunities": [{ "title": string, "impact"?: string, "detail"?: string }],
  "actionPlan": [{ "priority"?: number, "action": string, "rationale"?: string }],
  "healthScores": { "overall"?: number (0-100), "financial"?: number, "market"?: number, "social"?: number }
}
Rules:
- Analysis depth: ${analysisDepth}. ${depthInstructions[analysisDepth]}
- ${benchmarkNote}
- Use professional, actionable tone suitable for founders and consultants.
- Scores must be integers 0-100 when present.`

  try {
    await push(28, 'Calling AI model (this may take a minute)')
    const { parsed, raw, usage } = await callOpenAiWithRetry(openAiKey, model, systemPrompt, contextStr)

    await push(62, 'Normalizing SWOT, risks, and action plan')

    const swotObj = parsed.swot
    const risksJson = asArray(parsed.risks)
    const oppsJson = asArray(parsed.opportunities)
    const actionsJson = asArray(parsed.actionPlan)

    const companyRecord = asRecord(company as Record<string, unknown>)
    const priorScores = asRecord(companyRecord.health_scores)
    const ruleScores = computeWeightedHealthScores({
      company: companyRecord,
      financials: finRes.data ? asRecord(finRes.data as Record<string, unknown>) : null,
      market: marketRes.data ? asRecord(marketRes.data as Record<string, unknown>) : null,
      social: socialRes.data ? asRecord(socialRes.data as Record<string, unknown>) : null,
    })
    const merged = mergeLlmAndRuleScores(parsed.healthScores, ruleScores)
    const healthScores = {
      ...priorScores,
      overall: merged.overall,
      financial: merged.financial,
      market: merged.market,
      brand: merged.brandSocial,
      social: merged.brandSocial,
      lastAnalysisAt: consentIso,
      analysisDepth,
    }

    const payload = {
      rawOpenAi: raw,
      usage,
      structured: parsed,
      metadata: {
        model,
        analysisDepth,
        benchmarking,
        completedAt: new Date().toISOString(),
      },
    }

    await push(78, 'Persisting report and health scores')

    const { error: updateError } = await db
      .from('reports')
      .update({
        status: 'completed',
        executive_summary: parsed.executiveSummary,
        swot: swotObj,
        financial_analysis: parsed.financialAnalysis,
        market_analysis: parsed.marketAnalysis,
        social_analysis: parsed.socialAnalysis,
        risks: risksJson,
        opportunities: oppsJson,
        action_plan: actionsJson,
        health_scores: {
          overall: merged.overall,
          financial: merged.financial,
          market: merged.market,
          social: merged.brandSocial,
        },
        payload,
        source_model: model,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    await db.from('companies').update({ health_scores: healthScores, updated_at: new Date().toISOString() }).eq('id', companyId)

    const { error: historyErr } = await db.from('company_health_scores').insert({
      company_id: companyId,
      report_id: reportId,
      overall: merged.overall,
      financial: merged.financial,
      market: merged.market,
      brand_social: merged.brandSocial,
      benchmarks: benchmarking ? { enabled: true, analysisDepth } : {},
      notes: null,
      source: 'llm',
    })
    if (historyErr) {
      console.error('company_health_scores insert:', historyErr.message)
    }

    const companyName = typeof companyRecord.name === 'string' ? companyRecord.name : 'Your company'
    const displayName =
      typeof actor.user_metadata?.display_name === 'string'
        ? actor.user_metadata.display_name
        : typeof actor.email === 'string'
          ? actor.email.split('@')[0] ?? 'there'
          : 'there'
    const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
    const reportPath = appUrl ? `${appUrl}/report/${reportId}` : `/report/${reportId}`

    await push(88, 'Recording in-app notification')

    await createInAppNotification(db, {
      userId: actor.id,
      type: 'analysis_complete',
      message: `Analysis complete for ${companyName}. Open the report to review SWOT, risks, and actions.`,
      data: { reportId, companyId, analysisDepth },
    })

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey)
      await sendTemplatedEmailIfEnabled({
        admin,
        userId: actor.id,
        templateType: 'analysis_complete',
        placeholders: {
          userName: displayName,
          companyName,
          analysisId: reportId,
          reportUrl: reportPath,
        },
        metadata: { reportId, companyId },
      })
      const alt =
        typeof emailOverride === 'string' && emailOverride.trim().includes('@') ? emailOverride.trim() : ''
      const actorMail = typeof actor.email === 'string' ? actor.email.trim().toLowerCase() : ''
      if (alt && alt.toLowerCase() !== actorMail) {
        await sendDirectResendEmail({
          to: alt,
          subject: `PulseBoard analysis ready — ${companyName}`,
          html: `<p>Hi,</p><p>Your company health analysis for <strong>${companyName}</strong> is ready.</p><p><a href="${reportPath}">Open report</a></p>`,
        })
      }
    }

    await push(100, 'Analysis finished successfully')
    await db
      .from('reports')
      .update({
        progress_percent: 100,
        analysis_logs: memoryLogs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    return { ok: true, reportId, analysisDepth, sourceModel: model }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    memoryLogs.push({ t: new Date().toISOString(), m: `Error: ${message}` })
    await db
      .from('reports')
      .update({
        status: 'failed',
        progress_percent: 100,
        analysis_logs: memoryLogs,
        payload: {
          error: message,
          failedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    await createInAppNotification(db, {
      userId: actor.id,
      type: 'job_failed',
      message: `Analysis job failed: ${message}`,
      data: { reportId, companyId, error: message },
    })

    const failDisplayName =
      typeof actor.user_metadata?.display_name === 'string'
        ? actor.user_metadata.display_name
        : typeof actor.email === 'string'
          ? actor.email.split('@')[0] ?? 'there'
          : 'there'
    const appUrlFail = (
      Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('SITE_URL') ?? Deno.env.get('APP_BASE_URL') ?? ''
    ).replace(/\/$/, '')
    const retryUrl = appUrlFail ? `${appUrlFail}/analysis/generate` : '/analysis/generate'
    const skFail = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (skFail) {
      const admFail = createClient(supabaseUrl, skFail)
      await sendTemplatedEmailIfEnabled({
        admin: admFail,
        userId: actor.id,
        templateType: 'job_failed',
        placeholders: {
          userName: failDisplayName,
          message,
          retryUrl,
        },
        metadata: { reportId, companyId },
      })
    }

    return { ok: false, error: message, reportId }
  }
}
