/**
 * PulseBoard — retry sending from a prior email_dispatches row (owner-only).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { asRecord } from '../_shared/safe-json.ts'
import { applyTemplate } from '../_shared/transactional-email.ts'

const bodySchema = z.object({
  outboundId: z.string().uuid(),
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

    const { data: row, error: rowErr } = await userClient
      .from('email_dispatches')
      .select('*')
      .eq('id', parsed.data.outboundId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: 'Dispatch not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const r = asRecord(row)
    const templateType = typeof r.template_type === 'string' ? r.template_type : 'billing_alert'
    const meta = asRecord(r.metadata)
    const ph: Record<string, string> = {}
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === 'string') ph[k] = v
    }
    const dn =
      typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : user.email?.split('@')[0] ?? 'there'
    ph.userName = ph.userName ?? dn
    ph.message = ph.message ?? 'Please review your PulseBoard account.'

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: tmpl } = await userClient.from('email_templates').select('subject,body_html').eq('type', templateType).maybeSingle()
    const t = tmpl && typeof tmpl === 'object' ? asRecord(tmpl) : {}
    const subjectTpl = typeof t.subject === 'string' ? t.subject : (typeof r.subject === 'string' ? r.subject : 'PulseBoard')
    const htmlTpl =
      typeof t.body_html === 'string' ? t.body_html : '<p>Hi {{userName}},</p><p>{{message}}</p>'
    const subject = applyTemplate(subjectTpl, ph)
    const html = applyTemplate(htmlTpl, ph)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM') ?? 'PulseBoard <onboarding@example.com>'
    const to = typeof r.to_address === 'string' ? r.to_address : user.email ?? ''

    if (!apiKey || !to) {
      return new Response(JSON.stringify({ data: { ok: false, reason: 'missing_resend_or_recipient' } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    const payload: unknown = await res.json().catch(() => ({}))
    const p = asRecord(payload)

    if (!res.ok) {
      return new Response(JSON.stringify({ error: typeof p.message === 'string' ? p.message : 'Resend error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendId = typeof p.id === 'string' ? p.id : null
    const { data: ins } = await admin
      .from('email_dispatches')
      .insert({
        user_id: user.id,
        template_type: templateType,
        to_address: to,
        subject,
        resend_email_id: resendId,
        status: 'sent',
        metadata: { ...meta, retryOf: parsed.data.outboundId },
      })
      .select('id')
      .maybeSingle()
    const insRow = ins && typeof ins === 'object' ? asRecord(ins) : {}
    const newId = typeof insRow.id === 'string' ? insRow.id : null

    if (newId) {
      await admin.from('email_events').insert({
        dispatch_id: newId,
        status: 'retry_sent',
        payload: { resend: p },
      })
    }

    return new Response(JSON.stringify({ data: { ok: true, dispatchId: newId } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
