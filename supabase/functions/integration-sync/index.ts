/**
 * PulseBoard — Connector sync orchestrator: creates sync_jobs, fetches provider data (or mock),
 * writes data_snapshots and upserts company_financials / company_analytics / company_social / company_billing.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  transformGa4Report,
  transformLinkedInOrgMetrics,
  transformQuickBooksSummary,
  transformStripeBilling,
} from '../_shared/integration-transform.ts'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const integrationId = typeof body.integrationId === 'string' ? body.integrationId : ''
    if (!integrationId) return json({ error: 'integrationId required' }, 400)

    const { data: integration, error: iErr } = await userClient
      .from('integrations')
      .select('id, company_id, provider, cadence')
      .eq('id', integrationId)
      .maybeSingle()
    if (iErr || !integration) return json({ error: 'Integration not found' }, 404)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: jobRow, error: jErr } = await userClient
      .from('sync_jobs')
      .insert({
        company_id: integration.company_id,
        integration_id: integration.id,
        provider: integration.provider,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (jErr || !jobRow) return json({ error: jErr?.message ?? 'job failed' }, 500)

    await userClient
      .from('integrations')
      .update({ status: 'syncing', updated_at: new Date().toISOString() })
      .eq('id', integrationId)

    await sleep(200)

    const provider = integration.provider
    let records = 0
    const now = new Date().toISOString()

    if (provider === 'ga4') {
      const raw = {
        rows: [
          {
            sessions: 1200,
            users: 890,
            screenPageViews: 3400,
            bounceRate: 0.42,
            engagement: { avgSessionDuration: 180 },
            trafficSources: [{ source: 'organic', sessions: 400 }],
            deviceBreakdown: [{ device: 'mobile', share: 0.62 }],
            geoBreakdown: [{ country: 'US', sessions: 800 }],
          },
        ],
      }
      const mapped = transformGa4Report(raw)
      await admin.from('data_snapshots').insert({
        company_id: integration.company_id,
        provider,
        snapshot_type: 'incremental',
        payload: raw,
      })
      records += 1
      await admin.from('company_analytics').upsert({
        company_id: integration.company_id,
        sessions: mapped.sessions,
        users: mapped.users,
        pageviews: mapped.pageviews,
        bounce_rate: mapped.bounceRate,
        engagement_metrics: mapped.engagementMetrics,
        traffic_sources: mapped.trafficSources,
        device_breakdown: mapped.deviceBreakdown,
        geo_breakdown: mapped.geoBreakdown,
        source_provider: 'ga4',
        updated_at: now,
      })
      records += 1
    } else if (provider === 'quickbooks') {
      const raw = {
        revenue: 125000,
        expenses: 98000,
        profit: 27000,
        assets: 200000,
        liabilities: 85000,
        cash: 45000,
        debt: 30000,
        monthly: [{ month: '2026-01', revenue: 40000 }],
        reconciliationStatus: 'ok',
      }
      const mapped = transformQuickBooksSummary(raw)
      await admin.from('data_snapshots').insert({
        company_id: integration.company_id,
        provider,
        payload: raw,
      })
      records += 1
      await admin.from('company_financials').upsert({
        company_id: integration.company_id,
        revenue: mapped.revenue,
        expenses: mapped.expenses,
        profit: mapped.profit,
        assets: mapped.assets,
        liabilities: mapped.liabilities,
        cash: mapped.cash,
        debt: mapped.debt,
        per_month_metrics: mapped.perMonthMetrics,
        reconciliation_status: mapped.reconciliationStatus,
        source_provider: 'quickbooks',
        updated_at: now,
      })
      records += 1
    } else if (provider === 'linkedin') {
      const raw = {
        followerCount: 12800,
        engagementRate: 0.031,
        postsCount: 24,
        impressions: 89000,
        clicks: 1200,
        posts: [{ id: '1', impressions: 1000 }],
      }
      const mapped = transformLinkedInOrgMetrics(raw)
      await admin.from('data_snapshots').insert({
        company_id: integration.company_id,
        provider,
        payload: raw,
      })
      records += 1
      await admin.from('company_social').upsert({
        company_id: integration.company_id,
        followers: mapped.followers,
        engagement_rate: mapped.engagementRate,
        posts_count: mapped.postsCount,
        impressions: mapped.impressions,
        clicks: mapped.clicks,
        post_metrics: mapped.postMetrics,
        source_provider: 'linkedin',
        updated_at: now,
      })
      records += 1
    } else if (provider === 'stripe') {
      const raw = {
        subscriptions: [{ id: 'sub_1', status: 'active' }],
        invoices: [],
        payments: [],
        customerBalance: 0,
        planMetadata: { tier: 'pro' },
      }
      const mapped = transformStripeBilling(raw)
      await admin.from('data_snapshots').insert({
        company_id: integration.company_id,
        provider,
        payload: raw,
      })
      records += 1
      await admin.from('company_billing').upsert({
        company_id: integration.company_id,
        subscriptions: mapped.subscriptions,
        invoices: mapped.invoices,
        payments: mapped.payments,
        customer_balance: mapped.customerBalance,
        plan_metadata: mapped.planMetadata,
        source_provider: 'stripe',
        updated_at: now,
      })
      records += 1
    } else if (provider === 'csv') {
      await userClient
        .from('sync_jobs')
        .update({
          status: 'succeeded',
          completed_at: now,
          records_synced: 0,
          metadata: { note: 'csv provider uses csv-import function' },
        })
        .eq('id', jobRow.id)
      await userClient
        .from('integrations')
        .update({
          status: 'connected',
          last_synced_at: now,
          next_sync_at: null,
          updated_at: now,
        })
        .eq('id', integrationId)
      return json({ ok: true, jobId: jobRow.id, recordsSynced: 0 })
    } else {
      await userClient
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: now,
          error_message: `Unsupported provider: ${provider}`,
        })
        .eq('id', jobRow.id)
      await userClient
        .from('integrations')
        .update({ status: 'error', last_error: 'Unsupported provider', updated_at: now })
        .eq('id', integrationId)
      return json({ error: 'Unsupported provider' }, 400)
    }

    const next = new Date()
    if (integration.cadence === 'hourly') next.setHours(next.getHours() + 1)
    else next.setDate(next.getDate() + 1)

    await userClient
      .from('sync_jobs')
      .update({
        status: 'succeeded',
        completed_at: now,
        records_synced: records,
      })
      .eq('id', jobRow.id)

    await userClient
      .from('integrations')
      .update({
        status: 'connected',
        last_synced_at: now,
        next_sync_at: integration.cadence === 'manual' ? null : next.toISOString(),
        last_error: null,
        updated_at: now,
      })
      .eq('id', integrationId)

    await admin.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'integration_sync_complete',
      entity: 'sync_job',
      entity_id: jobRow.id,
      metadata: { provider, records },
    })

    return json({ ok: true, jobId: jobRow.id, recordsSynced: records })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
