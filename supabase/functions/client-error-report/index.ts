/**
 * PulseBoard — client runtime error reporting (Edge Function).
 * Throttled, PII-scrubbed payloads; inserts audit_logs via service role.
 * Optional: MONITORING_WEBHOOK_URL receives same scrubbed JSON (no secrets).
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

function scrubText(s: string, max = 4000): string {
  let t = s.slice(0, max)
  t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]')
  t = t.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[redacted-phone]')
  return t
}

const throttleBuckets = new Map<string, { windowStart: number; count: number }>()
const THROTTLE_MS = 60_000
const THROTTLE_MAX = 8

function throttleOk(key: string): boolean {
  const now = Date.now()
  const b = throttleBuckets.get(key)
  if (!b || now - b.windowStart > THROTTLE_MS) {
    throttleBuckets.set(key, { windowStart: now, count: 1 })
    return true
  }
  if (b.count >= THROTTLE_MAX) return false
  b.count += 1
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const raw: unknown = await req.json()
    if (!isRecord(raw)) {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const msg = typeof raw.errorMessage === 'string' ? raw.errorMessage : typeof raw.message === 'string' ? raw.message : ''
    if (!msg.trim()) {
      return json({ error: 'errorMessage required' }, 400)
    }

    const fingerprint = `${msg.slice(0, 120)}`
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!throttleOk(`${ip}:${fingerprint}`)) {
      return json({ ok: true, throttled: true })
    }

    const stack = typeof raw.stack === 'string' ? scrubText(raw.stack, 8000) : ''
    const route = typeof raw.route === 'string' ? raw.route.slice(0, 500) : ''
    const componentStack = typeof raw.componentStack === 'string' ? scrubText(raw.componentStack, 4000) : ''
    const correlationId =
      typeof raw.correlationId === 'string' && raw.correlationId.length <= 80 ? raw.correlationId : crypto.randomUUID()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    let actorUserId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data } = await supabase.auth.getUser(token)
      actorUserId = data.user?.id ?? null
    }

    const environment = Deno.env.get('ENVIRONMENT') ?? Deno.env.get('VERCEL_ENV') ?? 'production'
    const scrubbedMessage = scrubText(msg, 2000)
    const metadata = {
      message: scrubbedMessage,
      stack: stack || undefined,
      route: route || undefined,
      componentStack: componentStack || undefined,
      environment,
      correlationId,
    }

    const targetPayload: Record<string, unknown> = {
      route,
      environment,
      correlationId,
    }
    if (componentStack) targetPayload.componentStack = componentStack

    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId,
      action: 'client_runtime_error',
      entity: 'error_boundary',
      entity_id: correlationId,
      metadata,
      notes: scrubbedMessage,
      target: targetPayload,
    })

    const hook = Deno.env.get('MONITORING_WEBHOOK_URL')
    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pulseboard.client_error', payload: metadata }),
        })
      } catch {
        /* non-blocking */
      }
    }

    return json({ ok: true, correlationId })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
