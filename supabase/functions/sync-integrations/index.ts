import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MAX_RETRIES = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const body = await req.json()
    const companyId = body?.companyId ?? ''
    const provider = body?.provider ?? ''

    if (!companyId || !provider) {
      return new Response(JSON.stringify({ error: 'companyId and provider are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: createdJob } = await supabase
      .from('sync_jobs')
      .insert({
        company_id: companyId,
        provider,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id, attempt_count')
      .single()

    const attemptCount = createdJob?.attempt_count ?? 0
    const shouldRetry = attemptCount < MAX_RETRIES

    await supabase.from('sync_jobs').update({
      status: shouldRetry ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      records_synced: 0,
      error_message: shouldRetry ? null : 'Circuit breaker open after max retries.',
    }).eq('id', createdJob?.id ?? '')

    return new Response(JSON.stringify({ ok: true, jobId: createdJob?.id ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
