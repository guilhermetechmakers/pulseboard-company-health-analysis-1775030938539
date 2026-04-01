/**
 * PulseBoard — optional transactional email via Resend for auth-adjacent notices.
 * Integrates with: https://resend.com/docs/api-reference/emails/send-email
 * Secrets: RESEND_API_KEY, RESEND_FROM (e.g. "PulseBoard <onboarding@yourdomain.com>")
 *
 * Prefer Supabase Auth built-in emails for verification and password recovery in production.
 * This function is for custom templates or backup delivery when wired from the client/admin.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

type Body = {
  to: string
  subject: string
  html: string
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
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
    const body = raw as Partial<Body>
    const to = body?.to
    const subject = body?.subject
    const html = body?.html

    if (!isNonEmptyString(to) || !isNonEmptyString(subject) || !isNonEmptyString(html)) {
      return new Response(JSON.stringify({ error: 'Invalid payload: to, subject, and html are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM') ?? 'PulseBoard <onboarding@example.com>'

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          message: 'RESEND_API_KEY not configured; email not sent.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    const payload: unknown = await res.json().catch(() => ({}))

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Resend API error', details: payload }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, data: payload }), {
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
