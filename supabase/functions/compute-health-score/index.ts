/**
 * PulseBoard — rule-based health score computation (no LLM). Persists company_health_scores row
 * and updates companies.health_scores JSON for dashboard compatibility.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { asRecord } from '../_shared/safe-json.ts'
import { computeWeightedHealthScores } from '../_shared/health-score-engine.ts'

const bodySchema = z.object({
  companyId: z.string().uuid(),
  benchmarks: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jsonBody = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(jsonBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { companyId, benchmarks, notes } = parsed.data

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

    const [finRes, marketRes, socialRes] = await Promise.all([
      supabase.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
    ])

    const scores = computeWeightedHealthScores({
      company: asRecord(company as Record<string, unknown>),
      financials: finRes.data ? asRecord(finRes.data as Record<string, unknown>) : null,
      market: marketRes.data ? asRecord(marketRes.data as Record<string, unknown>) : null,
      social: socialRes.data ? asRecord(socialRes.data as Record<string, unknown>) : null,
    })

    const benchmarksPayload = benchmarks ?? {}

    const { data: inserted, error: insertError } = await supabase
      .from('company_health_scores')
      .insert({
        company_id: companyId,
        report_id: null,
        overall: scores.overall,
        financial: scores.financial,
        market: scores.market,
        brand_social: scores.brandSocial,
        benchmarks: benchmarksPayload,
        notes: notes ?? null,
        source: 'rules',
      })
      .select('id, company_id, scored_at, overall, financial, market, brand_social, source')
      .single()

    if (insertError || !inserted) {
      return new Response(JSON.stringify({ error: insertError?.message ?? 'Failed to save health score' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const companyRecord = asRecord(company as Record<string, unknown>)
    const prior = asRecord(companyRecord.health_scores)
    const health_scores = {
      ...prior,
      overall: scores.overall,
      financial: scores.financial,
      market: scores.market,
      brand: scores.brandSocial,
      lastRuleScoredAt: new Date().toISOString(),
    }

    await supabase.from('companies').update({ health_scores, updated_at: new Date().toISOString() }).eq('id', companyId)

    return new Response(
      JSON.stringify({
        data: {
          healthScore: inserted,
          breakdown: scores,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
