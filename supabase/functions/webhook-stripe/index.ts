/**
 * PulseBoard — Stripe Connect / Billing webhooks. Verifies Stripe-Signature (HMAC-SHA256).
 * Secret: STRIPE_WEBHOOK_SIGNING_SECRET. Upserts billing snapshot + audit log on invoice.payment_succeeded, customer.subscription.updated.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { transformStripeBilling } from '../_shared/integration-transform.ts'
import { asRecord } from '../_shared/safe-json.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return x === 0
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').map((p) => p.trim())
  const ts = parts.find((p) => p.startsWith('t='))?.slice(2)
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3)
  if (!ts || !v1) return false
  const signedPayload = `${ts}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return timingSafeEqual(hex, v1)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? ''
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  if (!secret || !sig || !(await verifyStripeSignature(body, sig, secret))) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  let event: { type?: string; data?: { object?: unknown } }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const type = typeof event.type === 'string' ? event.type : ''
  const obj = asRecord(event.data?.object)
  const companyId =
    typeof obj.metadata === 'object' && obj.metadata !== null && !Array.isArray(obj.metadata)
      ? (asRecord(obj.metadata).pulseboard_company_id as string | undefined)
      : undefined

  if (companyId && typeof companyId === 'string') {
    const raw = {
      subscriptions: type.includes('subscription') ? [event.data?.object] : [],
      invoices: type.includes('invoice') ? [event.data?.object] : [],
      payments: type.includes('payment') ? [event.data?.object] : [],
      customerBalance: null,
      planMetadata: { lastEventType: type },
    }
    const mapped = transformStripeBilling(raw)
    const now = new Date().toISOString()
    await admin.from('company_billing').upsert({
      company_id: companyId,
      subscriptions: mapped.subscriptions,
      invoices: mapped.invoices,
      payments: mapped.payments,
      customer_balance: mapped.customerBalance,
      plan_metadata: mapped.planMetadata,
      source_provider: 'stripe',
      updated_at: now,
    })
    await admin.from('data_snapshots').insert({
      company_id: companyId,
      provider: 'stripe',
      snapshot_type: 'webhook',
      payload: { type, object: event.data?.object ?? {} },
    })
  }

  await admin.from('audit_logs').insert({
    actor_user_id: null,
    action: 'stripe_webhook',
    entity: 'billing',
    entity_id: type,
    metadata: { companyId: companyId ?? null },
  })

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
})
