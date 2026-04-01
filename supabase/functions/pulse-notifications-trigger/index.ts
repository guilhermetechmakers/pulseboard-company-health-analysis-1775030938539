/**
 * Internal/authenticated notification trigger — mirrors POST /api/notifications/trigger.
 * Creates in-app notification + inbox row; optional billing/admin event types for ops.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { createInAppNotification } from '../_shared/pulseboard-notifications.ts'

const bodySchema = z.object({
  type: z.enum([
    'analysis_complete',
    'export_ready',
    'job_failed',
    'billing_alert',
    'admin_alert',
    'custom',
  ]),
  message: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const raw = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400)
    }

    const { type, message, data } = parsed.data
    const payload = data ?? {}

    if (type === 'admin_alert' || type === 'billing_alert') {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const role = prof && typeof prof === 'object' && 'role' in prof ? String((prof as { role?: unknown }).role) : ''
      if (role !== 'admin') {
        return json({ error: 'Forbidden' }, 403)
      }
    }

    const noteType = type === 'custom' ? 'custom_notification' : type

    const created = await createInAppNotification(supabase, {
      userId: user.id,
      type: noteType,
      message,
      data: payload as Record<string, unknown>,
    })

    if (!created) {
      return json({ error: 'Failed to create notification' }, 500)
    }

    return json({
      data: {
        notificationId: created.notificationId,
        inboxItemId: created.inboxItemId,
      },
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
