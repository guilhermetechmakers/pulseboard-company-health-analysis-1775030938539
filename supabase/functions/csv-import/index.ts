/**
 * PulseBoard — CSV/TSV import: parses delimited text, validates required columns, idempotent upserts
 * into company_financials, company_market_data, or company_social. Auth: Bearer user JWT.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { pickNumber } from '../_shared/safe-json.ts'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseDelimited(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0)
  return lines.map((line) => {
    const cells: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQ = !inQ
      } else if ((c === ',' || c === '\t') && !inQ) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    cells.push(cur.trim())
    return cells.map((c) => c.replace(/^"|"$/g, ''))
  })
}

function rowObject(headers: string[], row: string[]): Record<string, string> {
  const o: Record<string, string> = {}
  headers.forEach((h, i) => {
    o[h.toLowerCase().replace(/\s+/g, '_')] = row[i] ?? ''
  })
  return o
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
    const companyId = typeof body.companyId === 'string' ? body.companyId : ''
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''
    const targetModel = typeof body.targetModel === 'string' ? body.targetModel : 'financials'
    const fileName = typeof body.fileName === 'string' ? body.fileName : 'upload.csv'

    if (!companyId || !csvText) return json({ error: 'companyId and csvText required' }, 400)

    const { data: company, error: cErr } = await userClient
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (cErr || !company) return json({ error: 'Company not found' }, 404)

    const { data: uploadRow, error: uErr } = await userClient
      .from('csv_uploads')
      .insert({
        company_id: companyId,
        file_name: fileName,
        status: 'queued',
        target_model: targetModel,
      })
      .select('id')
      .single()
    if (uErr || !uploadRow) return json({ error: uErr?.message ?? 'upload record failed' }, 500)

    const grid = parseDelimited(csvText)
    if (grid.length < 2) {
      await userClient
        .from('csv_uploads')
        .update({ status: 'failed', error_message: 'No data rows', completed_at: new Date().toISOString() })
        .eq('id', uploadRow.id)
      return json({ error: 'No data rows' }, 400)
    }

    const headers = (grid[0] ?? []).map((h) => String(h))
    const dataRows = grid.slice(1)
    let rowsProcessed = 0
    const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : userClient
    const now = new Date().toISOString()

    if (targetModel === 'financials') {
      const required = ['revenue', 'expenses']
      const lower = headers.map((h) => h.toLowerCase())
      const missing = required.filter((r) => !lower.includes(r))
      if (missing.length) {
        await userClient
          .from('csv_uploads')
          .update({
            status: 'failed',
            error_message: `Missing columns: ${missing.join(', ')}`,
            completed_at: now,
          })
          .eq('id', uploadRow.id)
        return json({ error: `Missing columns: ${missing.join(', ')}` }, 400)
      }
      const agg = dataRows.map((r) => rowObject(headers, r))
      const revenue = agg.reduce((s, row) => s + (pickNumber(row.revenue) ?? 0), 0)
      const expenses = agg.reduce((s, row) => s + (pickNumber(row.expenses) ?? 0), 0)
      await admin.from('company_financials').upsert({
        company_id: companyId,
        revenue,
        expenses,
        profit: revenue - expenses,
        per_month_metrics: agg,
        source_provider: 'csv',
        updated_at: now,
      })
      rowsProcessed = agg.length
    } else if (targetModel === 'market') {
      const competitors = dataRows.map((r) => rowObject(headers, r))
      await admin.from('company_market_data').upsert({
        company_id: companyId,
        competitors,
        updated_at: now,
      })
      rowsProcessed = competitors.length
    } else if (targetModel === 'social') {
      const channels = dataRows.map((r) => rowObject(headers, r))
      const followers = channels.reduce((s, row) => s + (pickNumber(row.followers) ?? 0), 0)
      await admin.from('company_social').upsert({
        company_id: companyId,
        followers: followers || null,
        post_metrics: channels,
        source_provider: 'csv',
        updated_at: now,
      })
      rowsProcessed = channels.length
    } else {
      await userClient
        .from('csv_uploads')
        .update({ status: 'failed', error_message: 'Invalid targetModel', completed_at: now })
        .eq('id', uploadRow.id)
      return json({ error: 'Invalid targetModel' }, 400)
    }

    await userClient
      .from('csv_uploads')
      .update({
        status: 'completed',
        rows_processed: rowsProcessed,
        completed_at: now,
      })
      .eq('id', uploadRow.id)

    if (serviceKey) {
      await createClient(supabaseUrl, serviceKey).from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'csv_import_complete',
        entity: 'csv_upload',
        entity_id: uploadRow.id,
        metadata: { targetModel, rowsProcessed },
      })
    }

    return json({ ok: true, uploadId: uploadRow.id, rowsProcessed })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
