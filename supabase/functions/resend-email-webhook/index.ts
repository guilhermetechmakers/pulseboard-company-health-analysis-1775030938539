/**
 * PulseBoard — Resend webhook receiver for delivery events.
 * Maps Resend email id to email_dispatches.resend_email_id and appends email_events rows.
 * When RESEND_WEBHOOK_SECRET is set, requires Svix headers to be present.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { asRecord } from '../_shared/safe-json.ts'

function assertSvixHeadersPresent(secret: string, svixId: string, svixTimestamp: string, svixSignature: string): boolean {
  if (!secret) return true
  return Boolean(svixId && svixTimestamp && svixSignature)
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
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''
    const payload = await req.text()
    const svixId = req.headers.get('svix-id') ?? ''
    const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
    const svixSignature = req.headers.get('svix-signature') ?? ''
    if (!assertSvixHeadersPresent(secret, svixId, svixTimestamp, svixSignature)) {
      return new Response(JSON.stringify({ error: 'Missing webhook verification headers' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const root = asRecord(parsed)
    const data = asRecord(root.data)
    const emailId =
      typeof data.email_id === 'string'
        ? data.email_id
        : typeof data.id === 'string'
          ? data.id
          : typeof root.id === 'string'
            ? root.id
            : null

    const eventType = typeof root.type === 'string' ? root.type : 'unknown'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (serviceKey && emailId) {
      const admin = createClient(supabaseUrl, serviceKey)
      const { data: outbound } = await admin.from('email_dispatches').select('id').eq('resend_email_id', emailId).maybeSingle()
      const ob = outbound && typeof outbound === 'object' ? asRecord(outbound) : {}
      const dispatchId = typeof ob.id === 'string' ? ob.id : null

      if (dispatchId) {
        await admin.from('email_events').insert({
          dispatch_id: dispatchId,
          status: eventType,
          payload: root,
        })

        const lower = eventType.toLowerCase()
        let nextStatus = 'unknown'
        if (lower.includes('delivered')) nextStatus = 'delivered'
        else if (lower.includes('bounce')) nextStatus = 'bounced'
        else if (lower.includes('complained') || lower.includes('unsubscribe')) nextStatus = 'unsubscribed'

        await admin
          .from('email_dispatches')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', dispatchId)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
