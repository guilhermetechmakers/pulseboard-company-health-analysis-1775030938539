/**
 * PulseBoard — AI company health analysis (OpenAI).
 * Integrates with OpenAI Chat Completions; requires OPENAI_API_KEY secret.
 * Validates input, loads company + domain rows under RLS, retries transient failures with backoff.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
import { runCompanyHealthAnalysis } from '../_shared/company-health-analysis-runner.ts'

const requestSchema = z.object({
  companyId: z.string().uuid(),
  /** When set, continues a row created by pulse-analyses-api start_analysis (status queued). */
  reportId: z.string().uuid().optional(),
  analysisDepth: z.enum(['brief', 'standard', 'deep']).default('standard'),
  benchmarking: z.boolean().default(false),
  consent: z
    .boolean()
    .refine((v) => v === true, { message: 'AI processing consent is required' }),
  sendToEmail: z.boolean().optional().default(false),
  email: z.union([z.string().email(), z.literal('')]).optional(),
})

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

    const { companyId, reportId, analysisDepth, benchmarking, consent, sendToEmail, email } = parsedReq.data
    const delivery =
      sendToEmail && typeof email === 'string' && email.trim().includes('@') ? email.trim() : null

    const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
    if (scopeBlock) return scopeBlock

    const result = await runCompanyHealthAnalysis({
      db: supabase,
      supabaseUrl,
      openAiKey,
      model,
      actor: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata as Record<string, unknown> | null,
      },
      companyId,
      analysisDepth,
      benchmarking,
      consent,
      existingReportId: reportId ?? null,
      reportEmailOverride: delivery,
    })

    if (!result.ok) {
      if (!result.reportId) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.error.includes('not found') ? 404 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: result.error, reportId: result.reportId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        data: {
          reportId: result.reportId,
          analysisId: result.reportId,
          status: 'completed',
          analysisDepth: result.analysisDepth,
          sourceModel: result.sourceModel,
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
