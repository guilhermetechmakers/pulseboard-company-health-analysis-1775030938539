/**
 * PulseBoard — aggregated dashboard overview for a single company (auth + RLS).
 * Client: `invokePulseDashboardApi({ companyId })` → POST { op: 'overview', companyId }.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'

const bodySchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('overview'),
    companyId: z.string().uuid(),
  }),
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function assertCompanyAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return data !== null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed', data: null }, 405)
  }

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
    return json({ error: 'Unauthorized', data: null }, 401)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid body', data: null }, 400)
  }
  const { companyId } = parsed.data

  const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
  if (scopeBlock) return scopeBlock

  const ok = await assertCompanyAccess(supabase, user.id, companyId)
  if (!ok) {
    return json({ error: 'Company not found or access denied', data: null }, 404)
  }

  const [companyRes, finRes, reportsRes, integrationsRes, healthRes, notifRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, industry, health_scores, updated_at, last_analysis_at')
      .eq('id', companyId)
      .maybeSingle(),
    supabase.from('company_financials').select('revenue, profit, cash').eq('company_id', companyId).maybeSingle(),
    supabase
      .from('reports')
      .select('id, company_id, status, executive_summary, created_at, analysis_depth, health_scores, action_plan, risks')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('integrations').select('id, provider, status, last_synced_at').eq('company_id', companyId).order('provider'),
    supabase
      .from('company_health_scores')
      .select('scored_at, overall, financial, market, brand_social')
      .eq('company_id', companyId)
      .order('scored_at', { ascending: false })
      .limit(16),
    supabase
      .from('notification_inbox_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
      .is('deleted_at', null)
      .eq('archived', false),
  ])

  const company = companyRes.data ?? null
  if (!company?.id) {
    return json({ error: 'Company not found', data: null }, 404)
  }

  const fin = finRes.data ?? null
  const reportRows = Array.isArray(reportsRes.data) ? reportsRes.data : []
  const integrationRows = Array.isArray(integrationsRes.data) ? integrationsRes.data : []
  const healthRows = Array.isArray(healthRes.data) ? healthRes.data : []
  const sparkAsc = [...healthRows].reverse()

  const unreadInboxCount = typeof notifRes.count === 'number' ? notifRes.count : 0

  const financialSnapshot =
    fin && typeof fin === 'object'
      ? {
          revenue: typeof fin.revenue === 'number' ? fin.revenue : null,
          profit: typeof fin.profit === 'number' ? fin.profit : null,
          cash: typeof fin.cash === 'number' ? fin.cash : null,
        }
      : null

  return json({
    error: null,
    data: {
      company,
      recentReports: reportRows,
      healthSparkline: sparkAsc,
      integrations: integrationRows,
      unreadInboxCount,
      financialSnapshot,
    },
  })
})
