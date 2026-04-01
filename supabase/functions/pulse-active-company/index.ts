/**
 * PulseBoard — resolve/sync active company for single-company mode.
 * Auth: Bearer JWT. Reads/writes `profiles.last_context_company_id` and returns owned company row.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('resolve') }),
  z.object({ action: z.literal('sync_context'), companyId: z.string().uuid() }),
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
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
      return json({ error: 'Unauthorized' }, 401)
    }

    const raw = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('single_company_mode, last_context_company_id')
      .eq('id', user.id)
      .maybeSingle()

    const singleCompanyModeEnabled = profile?.single_company_mode !== false

    const { data: owned } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeCompanyId = owned?.id ?? null
    const companyName = typeof owned?.name === 'string' ? owned.name : null

    if (parsed.data.action === 'resolve') {
      return json({
        data: {
          activeCompanyId,
          companyName,
          singleCompanyModeEnabled,
          lastContextCompanyId: profile?.last_context_company_id ?? null,
        },
      })
    }

    const { companyId } = parsed.data
    if (!activeCompanyId || companyId !== activeCompanyId) {
      return json(
        {
          error: 'Company is not your active workspace',
          code: 'COMPANY_SCOPE_DENIED',
          remediation: 'You can only sync context to the company linked to your account.',
        },
        403,
      )
    }

    const { error: upErr } = await supabase
      .from('profiles')
      .update({ last_context_company_id: companyId })
      .eq('id', user.id)

    if (upErr) {
      return json({ error: upErr.message }, 500)
    }

    return json({ data: { ok: true, activeCompanyId, companyName, singleCompanyModeEnabled } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
