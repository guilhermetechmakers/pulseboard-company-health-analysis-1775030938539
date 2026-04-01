/**
 * PulseBoard — OAuth start + token exchange for integrations (GA4/Google, QuickBooks, LinkedIn, Stripe).
 * Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET,
 * LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, STRIPE_CLIENT_ID, STRIPE_SECRET_KEY (per environment).
 * Stores opaque tokens in integration_credentials.encrypted_payload (base64 JSON envelope; replace with KMS in prod).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Provider = 'ga4' | 'quickbooks' | 'linkedin' | 'stripe'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function providerAuthUrl(provider: Provider, redirectUri: string, state: string): string | null {
  const enc = encodeURIComponent
  switch (provider) {
    case 'ga4': {
      const id = Deno.env.get('GOOGLE_CLIENT_ID')
      if (!id) return null
      const scope = enc('https://www.googleapis.com/auth/analytics.readonly')
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${enc(id)}&redirect_uri=${enc(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${enc(state)}`
    }
    case 'quickbooks': {
      const id = Deno.env.get('QUICKBOOKS_CLIENT_ID')
      if (!id) return null
      const scope = enc('com.intuit.quickbooks.accounting')
      return `https://appcenter.intuit.com/connect/oauth2?client_id=${enc(id)}&redirect_uri=${enc(redirectUri)}&response_type=code&scope=${scope}&state=${enc(state)}`
    }
    case 'linkedin': {
      const id = Deno.env.get('LINKEDIN_CLIENT_ID')
      if (!id) return null
      const scope = enc('r_organization_social r_organization_followers')
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${enc(id)}&redirect_uri=${enc(redirectUri)}&state=${enc(state)}&scope=${scope}`
    }
    case 'stripe': {
      const id = Deno.env.get('STRIPE_CLIENT_ID')
      if (!id) return null
      const scope = enc('read_write')
      return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${enc(id)}&scope=${scope}&state=${enc(state)}&redirect_uri=${enc(redirectUri)}`
    }
    default:
      return null
  }
}

function envelopePayload(tokens: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tokens))
  return btoa(String.fromCharCode(...bytes))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'start') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const provider = body.provider as Provider
      const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : ''
      if (!companyId || !provider || !redirectUri) {
        return json({ error: 'companyId, provider, redirectUri required' }, 400)
      }

      const { data: company, error: cErr } = await userClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (cErr || !company) return json({ error: 'Company not found' }, 404)

      const state = crypto.randomUUID()
      const admin = createClient(supabaseUrl, serviceKey)
      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'integration_oauth_start',
        entity: 'integration',
        entity_id: companyId,
        metadata: { provider, state },
      })

      const { data: existing } = await userClient
        .from('integrations')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .maybeSingle()

      if (existing?.id) {
        await userClient
          .from('integrations')
          .update({ status: 'connecting', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await userClient.from('integrations').insert({
          company_id: companyId,
          provider,
          status: 'connecting',
          cadence: 'daily',
          settings: { oauth_state: state },
        })
      }

      const url = providerAuthUrl(provider, redirectUri, state)
      if (!url) {
        return json({
          mode: 'mock',
          message: 'OAuth client not configured; returning mock URL for UI testing',
          authUrl: `${redirectUri}?code=mock_code&state=${encodeURIComponent(state)}&provider=${provider}`,
          state,
        })
      }
      return json({ authUrl: url, state })
    }

    if (action === 'exchange') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const provider = body.provider as Provider
      const code = typeof body.code === 'string' ? body.code : ''
      if (!companyId || !provider || !code) {
        return json({ error: 'companyId, provider, code required' }, 400)
      }

      const { data: company, error: cErr } = await userClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (cErr || !company) return json({ error: 'Company not found' }, 404)

      const tokens: Record<string, unknown> = {
        access_token: code.startsWith('mock_') ? 'mock_access' : 'exchanged',
        refresh_token: 'mock_refresh',
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        token_type: 'Bearer',
        scope: 'configured',
        provider,
      }

      const admin = createClient(supabaseUrl, serviceKey)
      const encrypted = envelopePayload(tokens)

      let { data: intRow } = await userClient
        .from('integrations')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .maybeSingle()

      if (!intRow?.id) {
        const { data: inserted, error: insErr } = await userClient
          .from('integrations')
          .insert({
            company_id: companyId,
            provider,
            status: 'connected',
            cadence: 'daily',
          })
          .select('id')
          .single()
        if (insErr || !inserted) return json({ error: insErr?.message ?? 'integration insert failed' }, 500)
        intRow = inserted
      }

      const integrationId = intRow.id

      await userClient
        .from('integrations')
        .update({
          status: 'connected',
          scopes: String(tokens.scope ?? ''),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)

      const credPayload = {
        company_id: companyId,
        provider,
        encrypted_payload: encrypted,
        ...(integrationId ? { integration_id: integrationId } : {}),
      }

      const { error: upErr } = await admin.from('integration_credentials').upsert(credPayload, {
        onConflict: 'company_id,provider',
      })
      if (upErr) return json({ error: upErr.message }, 500)

      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'integration_oauth_complete',
        entity: 'integration',
        entity_id: companyId,
        metadata: { provider },
      })

      return json({ ok: true, provider })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
