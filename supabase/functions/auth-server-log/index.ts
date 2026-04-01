/**
 * PulseBoard — server-side audit log for auth-adjacent events (signup telemetry, password reset lifecycle).
 * Validates JSON body; inserts into public.audit_logs with service role. No secrets returned to client.
 * Client: `invokeAuthServerLog` in src/lib/supabase-functions.ts
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Body = {
  eventType: string
  email?: string
  metadata?: Record<string, unknown>
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

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
    const raw: unknown = await req.json()
    if (!isRecord(raw)) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const eventType = typeof raw.eventType === 'string' ? raw.eventType : ''
    if (!eventType) {
      return new Response(JSON.stringify({ error: 'eventType required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = typeof raw.email === 'string' ? raw.email : undefined
    const metadata = isRecord(raw.metadata) ? raw.metadata : {}

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    let actorUserId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data } = await supabase.auth.getUser(token)
      actorUserId = data.user?.id ?? null
    }

    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId,
      action: eventType,
      entity: 'auth',
      entity_id: email ?? null,
      metadata: { ...(metadata ?? {}), email: email ?? null },
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
