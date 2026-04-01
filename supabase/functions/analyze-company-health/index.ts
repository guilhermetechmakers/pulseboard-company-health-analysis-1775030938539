/**
 * PulseBoard — AI company health analysis (OpenAI).
 * Integrates with OpenAI Chat Completions; requires OPENAI_API_KEY secret.
 * Validates input, loads company + domain rows under RLS, retries transient failures with backoff.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { asArray, asRecord } from '../_shared/safe-json.ts'
import { computeWeightedHealthScores, mergeLlmAndRuleScores } from '../_shared/health-score-engine.ts'
import { createUserNotification } from '../_shared/pulse-notify.ts'
import { sendTemplatedEmailIfEnabled } from '../_shared/transactional-email.ts'

const requestSchema = z.object({
  companyId: z.string().uuid(),
  analysisDepth: z.enum(['brief', 'standard', 'deep']).default('standard'),
  benchmarking: z.boolean().default(false),
  consent: z
    .boolean()
    .refine((v) => v === true, { message: 'AI processing consent is required' }),
})

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jsonBody = await req.json().catch(() => null)
    const parsedReq = requestSchema.safeParse(jsonBody)
    if (!parsedReq.success) {
      return new Response(JSON.stringify({ error: parsedReq.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { companyId, analysisDepth, benchmarking, consent } = parsedReq.data

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [finRes, marketRes, socialRes, analyticsRes] = await Promise.all([
      supabase.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_analytics').select('*').eq('company_id', companyId).maybeSingle(),
    ])

    const context = {
      company: asRecord(company),
      financials: finRes.data ? asRecord(finRes.data) : {},
      market: marketRes.data ? asRecord(marketRes.data) : {},
      social: socialRes.data ? asRecord(socialRes.data) : {},
      analytics: analyticsRes.data ? asRecord(analyticsRes.data) : {},
    }

    const contextStr = truncateContext(JSON.stringify(context, null, 2), 14000)

    const depthInstructions: Record<string, string> = {
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

    const consentIso = new Date().toISOString()

    const { data: reportRow, error: insertError } = await supabase
      .from('reports')
      .insert({
        company_id: companyId,
        status: 'in_progress',
        initiated_by: user.id,
        analysis_depth: analysisDepth,
        benchmarking_enabled: benchmarking,
        consent_recorded_at: consentIso,
        source_model: model,
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
      return new Response(JSON.stringify({ error: insertError?.message ?? 'Failed to create report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reportId = reportRow.id as string

    try {
      const { parsed, raw, usage } = await callOpenAiWithRetry(openAiKey, model, systemPrompt, contextStr)

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

      const { error: updateError } = await supabase
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

      await supabase.from('companies').update({ health_scores: healthScores, updated_at: new Date().toISOString() }).eq('id', companyId)

      const { error: historyErr } = await supabase.from('company_health_scores').insert({
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
        typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : (typeof user.email === 'string' ? user.email.split('@')[0] : 'there')
      const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
      const reportPath = appUrl ? `${appUrl}/report/${reportId}` : `/report/${reportId}`

      await createUserNotification(supabase, {
        userId: user.id,
        type: 'analysis_complete',
        message: `Analysis complete for ${companyName}. Open the report to review SWOT, risks, and actions.`,
        data: { reportId, companyId, analysisDepth },
      })

      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey)
        await sendTemplatedEmailIfEnabled({
          admin,
          userId: user.id,
          templateType: 'analysis_complete',
          placeholders: {
            userName: displayName,
            companyName,
            analysisId: reportId,
            reportUrl: reportPath,
          },
          metadata: { reportId, companyId },
        })
      }

      return new Response(
        JSON.stringify({
          data: {
            reportId,
            status: 'completed',
            analysisDepth,
            sourceModel: model,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      await supabase
        .from('reports')
        .update({
          status: 'failed',
          payload: {
            error: message,
            failedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      await createUserNotification(supabase, {
        userId: user.id,
        type: 'job_failed',
        message: `Analysis job failed: ${message}`,
        data: { reportId, companyId, error: message },
      })

      const failDisplayName =
        typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : typeof user.email === 'string'
            ? user.email.split('@')[0] ?? 'there'
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
          userId: user.id,
          templateType: 'job_failed',
          placeholders: {
            userName: failDisplayName,
            message,
            retryUrl,
          },
          metadata: { reportId, companyId },
        })
      }

      return new Response(JSON.stringify({ error: message, reportId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
