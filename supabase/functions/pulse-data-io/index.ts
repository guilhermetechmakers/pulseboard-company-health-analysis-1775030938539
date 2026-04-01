/**
 * PulseBoard — Data import/export: CSV with column mappings, job status, CSV export presets.
 * Auth: Bearer user JWT. Uses service role for domain upserts and import_audit writes.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
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

function rowObject(
  headers: string[],
  row: string[],
  mappings: Record<string, string>,
): Record<string, string> {
  const o: Record<string, string> = {}
  headers.forEach((h, i) => {
    const key = h.trim()
    const target = mappings[key] && mappings[key].length > 0 ? mappings[key] : key.toLowerCase().replace(/\s+/g, '_')
    o[target] = row[i] ?? ''
  })
  return o
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n')
}

const MAX_EXPORT_CHARS = 1_500_000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : userClient

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    let op = typeof body.op === 'string' ? body.op : ''
    let reuseImportJobId: string | undefined

    if (op === 'import_retry') {
      const importJobId = typeof body.importJobId === 'string' ? body.importJobId : ''
      if (!importJobId) return json({ error: 'importJobId required' }, 400)
      const { data: existing, error: exErr } = await userClient
        .from('company_imports')
        .select('id, company_id, user_id, source_text, target_model, file_name, mapping')
        .eq('id', importJobId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (exErr || !existing?.source_text) {
        return json({ error: 'Import job not found or retry data unavailable' }, 404)
      }
      const { data: co } = await userClient
        .from('companies')
        .select('id')
        .eq('id', existing.company_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!co) return json({ error: 'Company not found' }, 404)
      body.companyId = existing.company_id
      body.csvText = existing.source_text
      body.targetModel = existing.target_model ?? 'financials'
      body.fileName = existing.file_name
      body.mapping = existing.mapping ?? {}
      reuseImportJobId = existing.id
      op = 'import_csv'
    }

    if (op === 'import_csv') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const csvText = typeof body.csvText === 'string' ? body.csvText : ''
      const targetModel =
        typeof body.targetModel === 'string' ? body.targetModel : 'financials'
      const fileName = typeof body.fileName === 'string' ? body.fileName : 'upload.csv'
      const mapping = asRecord(body.mapping)

      if (!companyId || !csvText) return json({ error: 'companyId and csvText required' }, 400)

      const importScope = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (importScope) return importScope

      const { data: company, error: cErr } = await userClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (cErr || !company) return json({ error: 'Company not found' }, 404)

      let jobId: string
      if (reuseImportJobId) {
        const { error: upErr } = await userClient
          .from('company_imports')
          .update({
            status: 'processing',
            file_name: fileName,
            target_model: targetModel,
            mapping,
            progress: 5,
            errors: [],
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reuseImportJobId)
          .eq('user_id', user.id)
        if (upErr) return json({ error: upErr.message }, 500)
        jobId = reuseImportJobId
      } else {
        const { data: jobRow, error: jErr } = await userClient
          .from('company_imports')
          .insert({
            company_id: companyId,
            user_id: user.id,
            status: 'processing',
            file_name: fileName,
            target_model: targetModel,
            mapping,
            progress: 5,
            source_text: csvText,
          })
          .select('id')
          .single()
        if (jErr || !jobRow) return json({ error: jErr?.message ?? 'import job create failed' }, 500)
        jobId = jobRow.id
      }

      const audit = async (action: string, detail: Record<string, unknown>) => {
        if (!serviceKey) return
        await admin.from('import_audit').insert({
          import_id: jobId,
          action,
          detail,
        })
      }

      await audit('started', { targetModel, fileName })

      const grid = parseDelimited(csvText)
      if (grid.length < 2) {
        await userClient
          .from('company_imports')
          .update({
            status: 'failed',
            error_message: 'No data rows',
            progress: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
        await audit('failed', { reason: 'no_data_rows' })
        return json({ error: 'No data rows', importJobId: jobId }, 400)
      }

      const headers = (grid[0] ?? []).map((h) => String(h))
      const dataRows = grid.slice(1)
      const now = new Date().toISOString()
      const validationErrors: string[] = []
      let rowsProcessed = 0

      try {
        if (targetModel === 'financials') {
          const lower = headers.map((h) => h.toLowerCase())
          const mappedTargets = new Set(Object.values(mapping))
          const hasRevenue =
            mappedTargets.has('revenue') || lower.some((h) => h === 'revenue' || h.replace(/\s/g, '_') === 'revenue')
          const hasExpenses =
            mappedTargets.has('expenses') || lower.some((h) => h === 'expenses' || h.replace(/\s/g, '_') === 'expenses')
          if (!hasRevenue || !hasExpenses) {
            validationErrors.push('Mapped or raw columns must include revenue and expenses')
          }
          if (validationErrors.length) {
            await userClient
              .from('company_imports')
              .update({
                status: 'failed',
                error_message: validationErrors.join('; '),
                errors: validationErrors,
                progress: 100,
                updated_at: now,
              })
              .eq('id', jobId)
            await audit('validation_failed', { errors: validationErrors })
            return json({ error: validationErrors[0], importJobId: jobId, validationErrors }, 422)
          }

          const agg = dataRows.map((r) => rowObject(headers, r, mapping))
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
          const competitors = dataRows.map((r) => rowObject(headers, r, mapping))
          await admin.from('company_market_data').upsert({
            company_id: companyId,
            competitors,
            updated_at: now,
          })
          rowsProcessed = competitors.length
        } else if (targetModel === 'social') {
          const channels = dataRows.map((r) => rowObject(headers, r, mapping))
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
            .from('company_imports')
            .update({
              status: 'failed',
              error_message: 'Invalid targetModel',
              progress: 100,
              updated_at: now,
            })
            .eq('id', jobId)
          return json({ error: 'Invalid targetModel', importJobId: jobId }, 400)
        }

        for (const [sourceKey, targetField] of Object.entries(mapping)) {
          if (typeof sourceKey === 'string' && typeof targetField === 'string' && targetField.length > 0) {
            const { error: mapErr } = await userClient.from('import_mappings').upsert(
              {
                user_id: user.id,
                source_key: sourceKey,
                target_field: targetField,
              },
              { onConflict: 'user_id,source_key,target_field' },
            )
            if (mapErr) {
              /* non-fatal: mapping persistence best-effort */
            }
          }
        }

        await userClient
          .from('company_imports')
          .update({
            status: 'completed',
            rows_processed: rowsProcessed,
            progress: 100,
            errors: [],
            updated_at: now,
          })
          .eq('id', jobId)

        await audit('completed', { rowsProcessed, targetModel })

        if (serviceKey) {
          await admin.from('audit_logs').insert({
            actor_user_id: user.id,
            action: 'data_import_completed',
            entity: 'company_import',
            entity_id: jobId,
            metadata: { companyId, targetModel, rowsProcessed },
          })
        }

        try {
          await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/compute-health-score`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              apikey: anon,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companyId, notes: 'csv-import-pulse-data-io' }),
          })
        } catch {
          /* non-blocking */
        }

        return json(
          {
            accepted: true,
            importJobId: jobId,
            status: 'completed',
            rowsProcessed,
          },
          202,
        )
      } catch (e) {
        const msg = (e as Error).message
        await userClient
          .from('company_imports')
          .update({
            status: 'failed',
            error_message: msg,
            progress: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
        await audit('failed', { message: msg })
        return json({ error: msg, importJobId: jobId }, 500)
      }
    }

    if (op === 'import_status') {
      const jobId = typeof body.importJobId === 'string' ? body.importJobId : ''
      if (!jobId) return json({ error: 'importJobId required' }, 400)
      const { data: row, error } = await userClient
        .from('company_imports')
        .select(
          'id,status,progress,rows_processed,errors,error_message,created_at,updated_at,target_model,file_name',
        )
        .eq('id', jobId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error || !row) return json({ error: 'Not found' }, 404)
      return json({
        status: row.status,
        progress: Number(row.progress),
        rowsProcessed: row.rows_processed,
        errors: Array.isArray(row.errors) ? row.errors : [],
        errorMessage: row.error_message,
        targetModel: row.target_model,
        fileName: row.file_name,
        updatedAt: row.updated_at,
      })
    }

    if (op === 'export_csv') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const presetRaw = typeof body.preset === 'string' ? body.preset : 'full_backup'
      const preset =
        presetRaw === 'compliance' || presetRaw === 'selective' || presetRaw === 'full_backup' ? presetRaw : 'full_backup'
      const format = body.format === 'xlsx' ? 'xlsx' : 'csv'
      const fields = Array.isArray(body.fields) ? (body.fields as unknown[]).filter((x) => typeof x === 'string') : []
      const scheduleCadence =
        typeof body.scheduleCadence === 'string' ? body.scheduleCadence : null

      if (!companyId) return json({ error: 'companyId required' }, 400)

      const exportScope = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (exportScope) return exportScope

      const { data: company, error: cErr } = await userClient
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (cErr || !company) return json({ error: 'Company not found' }, 404)

      const { data: exportRow, error: exErr } = await userClient
        .from('company_exports')
        .insert({
          user_id: user.id,
          company_id: companyId,
          scope: { preset, companyId, fields },
          format,
          status: 'processing',
          progress: 10,
          fields_subset: fields as string[],
          schedule_cadence: scheduleCadence,
        })
        .select('id')
        .single()
      if (exErr || !exportRow) return json({ error: exErr?.message ?? 'export job failed' }, 500)

      const exportId = exportRow.id
      const now = new Date().toISOString()

      const [fin, market, social] = await Promise.all([
        userClient.from('company_financials').select('*').eq('company_id', companyId).maybeSingle(),
        userClient.from('company_market_data').select('*').eq('company_id', companyId).maybeSingle(),
        userClient.from('company_social').select('*').eq('company_id', companyId).maybeSingle(),
      ])

      const lines: string[][] = []
      const useFieldFilter = preset === 'selective' && fields.length > 0
      const allow = (key: string) => !useFieldFilter || fields.includes(key)

      if (preset === 'compliance') {
        lines.push(['section', 'field', 'value'])
        if (allow('profile')) {
          lines.push(['profile', 'name', String(company.name ?? '')])
          lines.push(['profile', 'industry', String(company.industry ?? '')])
          lines.push(['profile', 'website', String(company.website ?? '')])
        }
        if (allow('financials') && fin.data) {
          lines.push(['financials', 'revenue', String(fin.data.revenue ?? '')])
          lines.push(['financials', 'expenses', String(fin.data.expenses ?? '')])
        }
      } else {
        lines.push(['pulseboard_export', 'preset', preset === 'selective' ? 'selective' : preset])
        lines.push(['company', 'id', companyId])
        if (allow('profile')) {
          lines.push(['company', 'name', String(company.name ?? '')])
          lines.push(['company', 'industry', String(company.industry ?? '')])
          lines.push(['company', 'website', String(company.website ?? '')])
          lines.push(['company', 'business_model', String(company.business_model ?? '')])
          lines.push(['company', 'target_customer', String(company.target_customer ?? '')])
          lines.push(['company', 'goals', String(company.goals ?? '')])
          lines.push(['company', 'products', String(company.products ?? '')])
        }
        if (allow('financials') && fin.data) {
          lines.push(['financials', 'revenue', String(fin.data.revenue ?? '')])
          lines.push(['financials', 'expenses', String(fin.data.expenses ?? '')])
          lines.push(['financials', 'profit', String(fin.data.profit ?? '')])
          lines.push(['financials', 'cash', String(fin.data.cash ?? '')])
          lines.push(['financials', 'debt', String(fin.data.debt ?? '')])
        }
        if (allow('market') && market.data) {
          lines.push(['market', 'competitors_json', JSON.stringify(market.data.competitors ?? [])])
          lines.push(['market', 'trends_json', JSON.stringify(market.data.trends ?? [])])
        }
        if (allow('social') && social.data) {
          lines.push(['social', 'followers', String(social.data.followers ?? '')])
          lines.push(['social', 'channels_json', JSON.stringify(social.data.post_metrics ?? [])])
        }
      }

      const csv = toCsv(lines)
      if (csv.length > MAX_EXPORT_CHARS) {
        await userClient
          .from('company_exports')
          .update({
            status: 'failed',
            error_message: 'Export too large',
            progress: 100,
            updated_at: now,
          })
          .eq('id', exportId)
        return json({ error: 'Export too large for inline download', exportJobId: exportId }, 413)
      }

      if (format === 'xlsx') {
        await userClient
          .from('company_exports')
          .update({
            status: 'failed',
            error_message: 'XLSX not yet supported; use CSV',
            progress: 100,
            updated_at: now,
          })
          .eq('id', exportId)
        return json({ error: 'XLSX not supported in this deployment', exportJobId: exportId }, 400)
      }

      await userClient
        .from('company_exports')
        .update({
          status: 'completed',
          progress: 100,
          result_csv: csv,
          result_size: csv.length,
          generated_at: now,
          updated_at: now,
        })
        .eq('id', exportId)

      if (serviceKey) {
        await admin.from('audit_logs').insert({
          actor_user_id: user.id,
          action: 'data_export_completed',
          entity: 'company_export',
          entity_id: exportId,
          metadata: { companyId, preset, size: csv.length },
        })
      }

      return json(
        {
          accepted: true,
          exportJobId: exportId,
          status: 'completed',
          downloadHint: 'Use export_download op with exportJobId',
        },
        202,
      )
    }

    if (op === 'export_status') {
      const exportJobId = typeof body.exportJobId === 'string' ? body.exportJobId : ''
      if (!exportJobId) return json({ error: 'exportJobId required' }, 400)
      const { data: row, error } = await userClient
        .from('company_exports')
        .select('id,status,progress,result_size,generated_at,error_message,format,scope')
        .eq('id', exportJobId)
        .maybeSingle()
      if (error || !row) return json({ error: 'Not found' }, 404)
      return json({
        status: row.status,
        progress: Number(row.progress),
        size: row.result_size,
        generatedAt: row.generated_at,
        errorMessage: row.error_message,
        format: row.format,
        scope: row.scope,
      })
    }

    if (op === 'export_download') {
      const exportJobId = typeof body.exportJobId === 'string' ? body.exportJobId : ''
      if (!exportJobId) return json({ error: 'exportJobId required' }, 400)
      const { data: row, error } = await userClient
        .from('company_exports')
        .select('id,result_csv,status,format,scope')
        .eq('id', exportJobId)
        .maybeSingle()
      if (error || !row) return json({ error: 'Not found' }, 404)
      if (row.status !== 'completed' || !row.result_csv) {
        return json({ error: 'Export not ready', status: row.status }, 409)
      }
      const now = new Date().toISOString()
      await userClient.from('company_exports').update({ downloaded_at: now, updated_at: now }).eq('id', exportJobId)
      const preset =
        row.scope && typeof row.scope === 'object' && row.scope !== null && 'preset' in row.scope
          ? String((row.scope as Record<string, unknown>).preset ?? 'export')
          : 'export'
      return json({
        fileName: `pulseboard-${preset}-${exportJobId.slice(0, 8)}.csv`,
        mimeType: 'text/csv',
        content: row.result_csv,
      })
    }

    return json({
      error: 'Unknown op',
      allowed: ['import_csv', 'import_retry', 'import_status', 'export_csv', 'export_status', 'export_download'],
    }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function asRecord(value: unknown): Record<string, string> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const o: Record<string, string> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string') o[k] = v
    }
    return o
  }
  return {}
}
