import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

type Provider = 'ga4' | 'quickbooks' | 'linkedin' | 'stripe'

function normalizeList(data: unknown): Array<Record<string, unknown>> {
  return Array.isArray(data) ? data.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>> : []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const provider = (payload?.provider ?? '') as Provider
    const sourceData = payload?.data ?? []
    const list = normalizeList(sourceData)

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transformed = (list ?? []).map((item) => ({
      provider,
      capturedAt: new Date().toISOString(),
      payload: item ?? {},
    }))

    return new Response(JSON.stringify({ ok: true, records: transformed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
