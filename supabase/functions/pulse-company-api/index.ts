/**
 * PulseBoard company API (Supabase Edge Function).
 * Maps to product REST surface for guarded company creation and telemetry-friendly errors.
 * Auth: Bearer user JWT. Uses anon key + user JWT so RLS applies.
 *
 * POST JSON body:
 * - { "action": "create_company", "payload": { "name": "...", ... } } — returns 409 with remediation if a company already exists.
 * - { "action": "log_telemetry", "event": "draft_saved", "metadata": {} } — inserts user_activity_logs row for the caller.
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

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !anon) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await req.json()
    body = isRecord(raw) ? raw : {}
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const action = str(body.action) ?? ''
  const supabaseUser = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser()
  if (userErr || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  if (action === 'log_telemetry') {
    const event = str(body.event) ?? 'unknown'
    const meta = isRecord(body.metadata) ? body.metadata : {}
    const { error } = await supabaseUser.from('user_activity_logs').insert({
      user_id: user.id,
      action: event,
      metadata: { ...meta, source: 'pulse-company-api' },
    })
    if (error) {
      return json({ error: error.message, code: 'TELEMETRY_FAILED' }, 422)
    }
    return json({ data: { ok: true } })
  }

  if (action === 'create_company') {
    const payload = isRecord(body.payload) ? body.payload : {}
    const name = str(payload.name)?.trim()
    if (!name) {
      return json(
        {
          error: 'Company name is required',
          code: 'VALIDATION_ERROR',
          remediation: 'Provide payload.name before creating a company.',
        },
        422,
      )
    }

    const { data: existing } = await supabaseUser.from('companies').select('id').maybeSingle()
    if (existing && isRecord(existing) && typeof existing.id === 'string') {
      return json(
        {
          error: 'You already have an active company',
          code: 'COMPANY_ALREADY_EXISTS',
          status: 409,
          remediation: 'Open your company workspace to edit profile and data, or contact support to consolidate legacy duplicates.',
          existingCompanyId: existing.id,
        },
        409,
      )
    }

    const industry = str(payload.industry) ?? null
    const website = str(payload.website) ?? null
    const business_model = str(payload.business_model) ?? null
    const target_customer = str(payload.target_customers ?? payload.target_customer) ?? null
    const products_services_raw = payload.products_services
    const products_services = Array.isArray(products_services_raw)
      ? products_services_raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
      : []
    const products =
      products_services.length > 0 ? products_services.join(', ') : str(payload.products) ?? null

    const { data: inserted, error: insErr } = await supabaseUser
      .from('companies')
      .insert({
        user_id: user.id,
        name,
        industry,
        website,
        business_model,
        target_customer,
        products,
        products_services,
        onboarding_complete: payload.onboarding_complete === false ? false : true,
      })
      .select('id')
      .maybeSingle()

    if (insErr) {
      if (insErr.code === '23505') {
        return json(
          {
            error: 'You already have an active company',
            code: 'COMPANY_ALREADY_EXISTS',
            status: 409,
            remediation: 'Only one company is allowed per account. Use the company workspace or request admin consolidation.',
          },
          409,
        )
      }
      return json({ error: insErr.message, code: 'CREATE_FAILED' }, 422)
    }

    const id = inserted && isRecord(inserted) && typeof inserted.id === 'string' ? inserted.id : null
    await supabaseUser.from('user_activity_logs').insert({
      user_id: user.id,
      action: 'company_created',
      metadata: { companyId: id, source: 'pulse-company-api' },
    })

    return json({ data: { companyId: id } })
  }

  return json(
    {
      error: 'Unknown action',
      allowed: ['create_company', 'log_telemetry'],
    },
    400,
  )
})
