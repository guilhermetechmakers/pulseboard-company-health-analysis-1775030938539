import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature') ?? ''
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ error: 'Missing webhook verification headers.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const event = await req.json()
    const eventType = event?.type ?? 'unknown'
    const companyId = event?.data?.object?.metadata?.company_id ?? null

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    if (companyId) {
      await supabase.from('audit_logs').insert({
        action: 'stripe_webhook_received',
        entity: 'billing',
        entity_id: companyId,
        metadata: { eventType },
      })
    }

    return new Response(JSON.stringify({ received: true, eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
