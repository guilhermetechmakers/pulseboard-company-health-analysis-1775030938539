/**
 * Resend-backed transactional email with preference checks and template rendering.
 * Secrets: RESEND_API_KEY, RESEND_FROM, optional APP_BASE_URL for default links.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type ChannelPrefs = { inApp?: boolean; email?: boolean }

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function channelForEvent(channels: Record<string, unknown>, eventType: string): ChannelPrefs {
  if (!Object.hasOwn(channels, eventType)) {
    return { inApp: true, email: true }
  }
  const raw = asRecord(channels[eventType])
  return {
    inApp: raw.inApp !== false,
    email: raw.email !== false,
  }
}

export function applyTemplate(template: string, placeholders: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(placeholders)) {
    const safe = value ?? ''
    out = out.split(`{{${key}}}`).join(safe)
  }
  return out
}

export async function sendTemplatedEmailIfEnabled(input: {
  admin: SupabaseClient
  userId: string
  templateType: string
  placeholders: Record<string, string>
  metadata?: Record<string, unknown>
}): Promise<{ sent: boolean; skipped?: boolean; reason?: string; dispatchId?: string }> {
  const { admin, userId, templateType, placeholders, metadata } = input

  const { data: prefRow } = await admin.from('notification_preferences').select('channels').eq('user_id', userId).maybeSingle()

  const channels = asRecord(prefRow?.channels)
  const ch = channelForEvent(channels, templateType)
  if (!ch.email) {
    return { sent: false, skipped: true, reason: 'email_disabled_for_event' }
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr || !userData?.user?.email) {
    return { sent: false, skipped: true, reason: 'user_email_unavailable' }
  }

  const to = userData.user.email

  const { data: tmpl, error: tErr } = await admin.from('email_templates').select('*').eq('type', templateType).maybeSingle()

  if (tErr || !tmpl) {
    return { sent: false, skipped: true, reason: 'template_missing' }
  }

  const row = asRecord(tmpl)
  const subjectTpl = typeof row.subject === 'string' ? row.subject : ''
  const htmlTpl = typeof row.body_html === 'string' ? row.body_html : ''
  const subject = applyTemplate(subjectTpl, placeholders)
  const html = applyTemplate(htmlTpl, placeholders)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM') ?? 'PulseBoard <onboarding@example.com>'

  if (!apiKey) {
    return { sent: false, skipped: true, reason: 'resend_not_configured' }
  }

  const { data: dispatchIns, error: dInsErr } = await admin
    .from('email_dispatches')
    .insert({
      user_id: userId,
      template_type: templateType,
      to_address: to,
      subject,
      status: 'sending',
      metadata: metadata ?? {},
    })
    .select('id')
    .maybeSingle()

  if (dInsErr || !dispatchIns || typeof dispatchIns.id !== 'string') {
    return { sent: false, reason: 'dispatch_insert_failed' }
  }

  const dispatchId = dispatchIns.id as string

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
  const resendId = typeof p.id === 'string' ? p.id : null

  if (!res.ok) {
    await admin
      .from('email_dispatches')
      .update({
        status: 'failed',
        last_error: JSON.stringify(payload),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dispatchId)
    return { sent: false, reason: 'resend_http_error', dispatchId }
  }

  await admin
    .from('email_dispatches')
    .update({
      resend_email_id: resendId,
      status: 'sent',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatchId)

  await admin.from('email_events').insert({
    dispatch_id: dispatchId,
    status: 'sent',
    payload: { resend: p },
  })

  return { sent: true, dispatchId }
}
