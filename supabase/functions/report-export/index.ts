/**
 * PulseBoard — server-side report export (PDF/HTML) with queued status on export_jobs.
 * Requires SUPABASE_SERVICE_ROLE_KEY for storage upload and job writes; verifies JWT + company ownership.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { asRecord } from '../_shared/safe-json.ts'
import { createUserNotification } from '../_shared/pulse-notify.ts'
import { sendTemplatedEmailIfEnabled } from '../_shared/transactional-email.ts'
import { buildReportHtmlDocument, buildReportPdfBytes, type ReportPdfSections } from '../_shared/report-pdf.ts'

const sectionKeySchema = z.enum([
  'executiveSummary',
  'swot',
  'financial',
  'market',
  'social',
  'risks',
  'opportunities',
  'actions',
])

const requestSchema = z.object({
  reportId: z.string().uuid(),
  sections: z.array(sectionKeySchema).min(1),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  format: z.enum(['pdf', 'html']).default('pdf'),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  language: z.string().optional(),
})

function swotToLines(swot: unknown): string[] {
  const o = asRecord(swot)
  const keys = ['strengths', 'weaknesses', 'opportunities', 'threats'] as const
  const out: string[] = []
  for (const k of keys) {
    const raw = o[k]
    const arr = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
    for (const item of arr) {
      out.push(`${k}: ${item}`)
    }
  }
  return out
}

function listFromRisks(risks: unknown): string[] {
  const arr = Array.isArray(risks) ? risks : []
  return arr.map((r, i) => {
    const row = asRecord(r)
    const title = typeof row.title === 'string' ? row.title : `Risk ${i + 1}`
    const detail = typeof row.detail === 'string' ? row.detail : ''
    const sev = typeof row.severity === 'string' ? row.severity : ''
    return [title, sev, detail].filter(Boolean).join(' — ')
  })
}

function listFromOpportunities(opps: unknown): string[] {
  const arr = Array.isArray(opps) ? opps : []
  return arr.map((r, i) => {
    const row = asRecord(r)
    const title = typeof row.title === 'string' ? row.title : `Opportunity ${i + 1}`
    const detail = typeof row.detail === 'string' ? row.detail : ''
    const impact = typeof row.impact === 'string' ? row.impact : ''
    return [title, impact, detail].filter(Boolean).join(' — ')
  })
}

function listFromActions(actions: unknown): string[] {
  const arr = Array.isArray(actions) ? actions : []
  return arr.map((r, i) => {
    const row = asRecord(r)
    const action = typeof row.action === 'string' ? row.action : `Action ${i + 1}`
    const rationale = typeof row.rationale === 'string' ? row.rationale : ''
    const priority = typeof row.priority === 'number' ? `P${row.priority}` : ''
    return [priority, action, rationale].filter(Boolean).join(' — ')
  })
}

function buildSectionsPayload(
  report: Record<string, unknown>,
  companyName: string,
  included: Set<string>,
): ReportPdfSections {
  const exec = typeof report.executive_summary === 'string' ? report.executive_summary : ''
  const fin = typeof report.financial_analysis === 'string' ? report.financial_analysis : ''
  const market = typeof report.market_analysis === 'string' ? report.market_analysis : ''
  const social = typeof report.social_analysis === 'string' ? report.social_analysis : ''

  return {
    companyName,
    reportTitle: 'Company health report',
    generatedAt: new Date().toISOString(),
    executiveSummary: included.has('executiveSummary') ? exec : '',
    swotLines: included.has('swot') ? swotToLines(report.swot) : [],
    financialAnalysis: included.has('financial') ? fin : '',
    marketAnalysis: included.has('market') ? market : '',
    socialAnalysis: included.has('social') ? social : '',
    risksLines: included.has('risks') ? listFromRisks(report.risks) : [],
    opportunitiesLines: included.has('opportunities') ? listFromOpportunities(report.opportunities) : [],
    actionPlanLines: included.has('actions') ? listFromActions(report.action_plan) : [],
  }
}

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
    const parsed = requestSchema.safeParse(jsonBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { reportId, sections, orientation, format, primaryColor, secondaryColor, language } = parsed.data
    const included = new Set(sections)

    const { data: report, error: reportError } = await userClient.from('reports').select('*').eq('id', reportId).maybeSingle()

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: 'Report not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reportRow = asRecord(report)
    const companyId = typeof reportRow.company_id === 'string' ? reportRow.company_id : ''

    const { data: company, error: companyError } = await userClient
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const companyRecord = asRecord(company as Record<string, unknown>)
    const companyName = typeof companyRecord.name === 'string' ? companyRecord.name : 'Company'

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: branding } = await admin.from('company_branding').select('*').eq('company_id', companyId).maybeSingle()
    const brand = branding ? asRecord(branding as Record<string, unknown>) : {}
    const primary =
      primaryColor ??
      (typeof brand.primary_color === 'string' ? brand.primary_color : '#0B6AF7')
    const secondary =
      secondaryColor ??
      (typeof brand.secondary_color === 'string' ? brand.secondary_color : '#064FD6')

    const exportId = crypto.randomUUID()
    const exportParams = {
      sections,
      orientation,
      format,
      primaryColor: primary,
      secondaryColor: secondary,
      language: language ?? 'en',
    }

    const { error: insertError } = await admin.from('export_jobs').insert({
      id: exportId,
      company_id: companyId,
      report_id: reportId,
      initiated_by: user.id,
      export_params: exportParams,
      status: 'processing',
      progress: 10,
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      await admin
        .from('export_jobs')
        .update({ progress: 35, updated_at: new Date().toISOString() })
        .eq('id', exportId)

      const sectionsPayload = buildSectionsPayload(reportRow, companyName, included)

      const ext = format === 'html' ? 'html' : 'pdf'
      const storagePath = `reports/${companyId}/${reportId}/${exportId}.${ext}`
      const contentType = format === 'html' ? 'text/html' : 'application/pdf'

      let body: Uint8Array
      if (format === 'html') {
        const html = buildReportHtmlDocument(sectionsPayload, { orientation, primaryColor: primary, secondaryColor: secondary })
        body = new TextEncoder().encode(html)
      } else {
        body = await buildReportPdfBytes(sectionsPayload, {
          orientation,
          primaryColor: primary,
          secondaryColor: secondary,
        })
      }

      await admin
        .from('export_jobs')
        .update({ progress: 70, updated_at: new Date().toISOString() })
        .eq('id', exportId)

      const upload = await admin.storage.from('report-exports').upload(storagePath, body, {
        contentType,
        upsert: true,
      })

      if (upload.error) {
        throw new Error(upload.error.message)
      }

      await admin
        .from('export_jobs')
        .update({
          status: 'completed',
          progress: 100,
          storage_path: storagePath,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId)

      await admin.from('user_activity_logs').insert({
        user_id: user.id,
        action: 'report_exported',
        metadata: { exportId, reportId, companyId, format, orientation },
      })

      const signed = await admin.storage.from('report-exports').createSignedUrl(storagePath, 3600)
      const exportUrl = signed.data?.signedUrl ?? ''

      await createUserNotification(admin, {
        userId: user.id,
        type: 'export_ready',
        message: `Export for ${companyName} is ready (${format.toUpperCase()}). Download from the export screen.`,
        data: { exportId, reportId, companyId, format, signedUrl: exportUrl },
      })

      const exportDisplayName =
        typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : typeof user.email === 'string'
            ? user.email.split('@')[0] ?? 'there'
            : 'there'
      const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
      const exportPage = appUrl ? `${appUrl}/export/${reportId}` : `/export/${reportId}`
      await sendTemplatedEmailIfEnabled({
        admin,
        userId: user.id,
        templateType: 'export_ready',
        placeholders: {
          userName: exportDisplayName,
          companyName,
          exportUrl: exportUrl || exportPage,
        },
        metadata: { exportId, reportId, companyId },
      })

      return new Response(
        JSON.stringify({
          data: {
            exportId,
            status: 'completed',
            storagePath,
            signedUrl: signed.data?.signedUrl ?? null,
            format,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      await admin
        .from('export_jobs')
        .update({
          status: 'failed',
          progress: 0,
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId)

      await createUserNotification(admin, {
        userId: user.id,
        type: 'job_failed',
        message: `Report export failed: ${message}`,
        data: { exportId, reportId, companyId, error: message },
      })

      return new Response(JSON.stringify({ error: message, exportId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
