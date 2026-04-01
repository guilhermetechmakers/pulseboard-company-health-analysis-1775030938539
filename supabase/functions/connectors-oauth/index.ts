import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Provider = 'ga4' | 'quickbooks' | 'linkedin' | 'stripe'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const payload = await req.json()
    const provider = (payload?.provider ?? '') as Provider
    const code = payload?.code ?? null
    const companyId = payload?.companyId ?? null

    if (!provider || !code || !companyId) {
      return new Response(JSON.stringify({ error: 'Missing OAuth callback fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const encryptedPayload = btoa(JSON.stringify({ code, receivedAt: new Date().toISOString() }))
    await supabase.from('integration_credentials').upsert({
      company_id: companyId,
      provider,
      encrypted_payload: encryptedPayload,
    })

    await supabase.from('audit_logs').insert({
      action: 'integration_connected',
      entity: 'integration',
      entity_id: companyId,
      metadata: { provider },
    })

    return new Response(JSON.stringify({ ok: true, provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
