/**
 * PulseBoard — presigned download URL for completed report exports (private bucket).
 * Verifies JWT and export_jobs row visibility via RLS before signing with service role.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'

const bodySchema = z.object({
  exportId: z.string().uuid(),
  expiresIn: z.number().int().min(60).max(86_400).default(3600),
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

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const jsonBody = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(jsonBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { exportId, expiresIn } = parsed.data

    const { data: job, error: jobError } = await userClient.from('export_jobs').select('*').eq('id', exportId).maybeSingle()

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Export not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const row = job as Record<string, unknown>
    const status = typeof row.status === 'string' ? row.status : ''
    const storagePath = typeof row.storage_path === 'string' ? row.storage_path : ''

    if (status !== 'completed' || !storagePath) {
      return new Response(JSON.stringify({ error: 'Export is not ready for download' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const signed = await admin.storage.from('report-exports').createSignedUrl(storagePath, expiresIn)

    if (signed.error || !signed.data?.signedUrl) {
      return new Response(JSON.stringify({ error: signed.error?.message ?? 'Could not create signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        data: {
          signedUrl: signed.data.signedUrl,
          expiresIn,
          path: storagePath,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
