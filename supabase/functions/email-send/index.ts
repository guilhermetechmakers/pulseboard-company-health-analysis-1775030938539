/**
 * PulseBoard — authenticated transactional email (Resend) using shared templating + dispatch logging.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { sendTemplatedEmailIfEnabled } from '../_shared/transactional-email.ts'

const bodySchema = z.object({
  templateType: z.enum([
    'verification',
    'password_reset',
    'analysis_complete',
    'export_ready',
    'billing_alert',
    'job_failed',
  ]),
  placeholders: z.record(z.string()).default({}),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raw: unknown = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const result = await sendTemplatedEmailIfEnabled({
      admin,
      userId: user.id,
      templateType: parsed.data.templateType,
      placeholders: parsed.data.placeholders ?? {},
      metadata: { source: 'email-send' },
    })

    return new Response(
      JSON.stringify({
        data: {
          sent: result.sent,
          skipped: result.skipped ?? false,
          reason: result.reason ?? null,
          dispatchId: result.dispatchId ?? null,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
