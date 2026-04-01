/**
 * PulseBoard — server-side report export (PDF/HTML) with queued jobs on export_jobs.
 * Uses EdgeRuntime.waitUntil when available so the client can poll status while generation runs.
 * Requires SUPABASE_SERVICE_ROLE_KEY; verifies JWT + company ownership.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
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

const brandingSchema = z.object({
  includeLogo: z.boolean().default(false),
  logoUrl: z.string().url().optional().nullable(),
  whiteLabel: z.boolean().default(false),
  colorScheme: z.string().max(64).optional().nullable(),
})

const deliverySchema = z.object({
  email: z.string().email().optional().nullable(),
  notifyByEmail: z.boolean().default(false),
})

const requestSchema = z.object({
  reportId: z.string().uuid(),
  sections: z.array(sectionKeySchema).min(1),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  pageSize: z.enum(['A4', 'Letter']).default('A4'),
  format: z.enum(['pdf', 'html']).default('pdf'),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  language: z.string().optional(),
  branding: brandingSchema.default({ includeLogo: false, whiteLabel: false }),
  delivery: deliverySchema.default({ notifyByEmail: false }),
})

function edgeRuntimeWaitUntil(): { waitUntil: (p: Promise<unknown>) => void } | undefined {
  return (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime
}

function uint8ToBase64(u8: Uint8Array): string {
  const chunkSize = 0x8000
  let s = ''
  for (let i = 0; i < u8.length; i += chunkSize) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize) as unknown as number[])
  }
  return btoa(s)
}

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

function logoMimeFromPath(path: string): 'image/png' | 'image/jpeg' {
  const p = path.toLowerCase()
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
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

    const { reportId, sections, orientation, pageSize, format, primaryColor, secondaryColor, language, branding, delivery } =
      parsed.data
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

    const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
    if (scopeBlock) return scopeBlock

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

    const { data: profile } = await admin.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle()
    const tierRaw = profile && typeof (profile as { plan_tier?: string }).plan_tier === 'string'
      ? (profile as { plan_tier: string }).plan_tier
      : 'starter'
    const whiteLabelAllowed = tierRaw === 'pro' || tierRaw === 'agency'
    const whiteLabel = Boolean(branding.whiteLabel && whiteLabelAllowed)

    const { data: companyBrandRow } = await admin.from('company_branding').select('*').eq('company_id', companyId).maybeSingle()
    const brand = companyBrandRow ? asRecord(companyBrandRow as Record<string, unknown>) : {}
    const primary =
      primaryColor ?? (typeof brand.primary_color === 'string' ? brand.primary_color : '#0B6AF7')
    const secondary =
      secondaryColor ?? (typeof brand.secondary_color === 'string' ? brand.secondary_color : '#064FD6')
    const logoPath = typeof brand.logo_storage_path === 'string' ? brand.logo_storage_path.trim() : ''

    if (branding.includeLogo && !logoPath) {
      return new Response(
        JSON.stringify({
          error: 'Upload a company logo in export settings before including it in the PDF.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (delivery.notifyByEmail) {
      const em = typeof delivery.email === 'string' ? delivery.email.trim() : ''
      if (!em || !em.includes('@')) {
        return new Response(JSON.stringify({ error: 'Provide a valid delivery email when email export is enabled.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const exportId = crypto.randomUUID()
    const exportParams = {
      sections,
      orientation,
      pageSize,
      format,
      primaryColor: primary,
      secondaryColor: secondary,
      language: language ?? 'en',
      branding: { ...branding, whiteLabel },
      delivery: delivery.notifyByEmail ? { email: delivery.email, notifyByEmail: true } : { notifyByEmail: false },
    }

    const { error: insertError } = await admin.from('export_jobs').insert({
      id: exportId,
      company_id: companyId,
      report_id: reportId,
      initiated_by: user.id,
      export_params: exportParams,
      status: 'queued',
      progress: 0,
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const runExport = async () => {
      try {
        await admin
          .from('export_jobs')
          .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })
          .eq('id', exportId)

        let logoBytes: Uint8Array | null = null
        let logoMime: 'image/png' | 'image/jpeg' = 'image/png'
        if (branding.includeLogo && logoPath) {
          const dl = await admin.storage.from('branding-assets').download(logoPath)
          if (!dl.error && dl.data) {
            const ab = await dl.data.arrayBuffer()
            logoBytes = new Uint8Array(ab)
            logoMime = logoMimeFromPath(logoPath)
          }
        }

        await admin
          .from('export_jobs')
          .update({ progress: 35, updated_at: new Date().toISOString() })
          .eq('id', exportId)

        const sectionsPayload = buildSectionsPayload(reportRow, companyName, included)

        const ext = format === 'html' ? 'html' : 'pdf'
        const storagePath = `reports/${companyId}/${reportId}/${exportId}.${ext}`
        const contentType = format === 'html' ? 'text/html' : 'application/pdf'

        let logoDataUrl: string | null = null
        const lowerPath = logoPath.toLowerCase()
        const canEmbedRaster =
          lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')
        if (format === 'html' && logoBytes !== null && logoBytes.byteLength > 0 && canEmbedRaster) {
          const b64 = uint8ToBase64(logoBytes)
          const prefix = logoMime === 'image/jpeg' ? 'data:image/jpeg;base64,' : 'data:image/png;base64,'
          logoDataUrl = `${prefix}${b64}`
        }

        let body: Uint8Array
        if (format === 'html') {
          const html = buildReportHtmlDocument(sectionsPayload, {
            orientation,
            pageSize,
            primaryColor: primary,
            secondaryColor: secondary,
            whiteLabel,
            logoDataUrl,
          })
          body = new TextEncoder().encode(html)
        } else {
          body = await buildReportPdfBytes(sectionsPayload, {
            orientation,
            pageSize,
            primaryColor: primary,
            secondaryColor: secondary,
            whiteLabel,
            logoBytes,
            logoMime,
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

        const fileSize = body.byteLength

        await admin
          .from('export_jobs')
          .update({
            status: 'completed',
            progress: 100,
            storage_path: storagePath,
            file_size_bytes: fileSize,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', exportId)

        await admin.from('user_activity_logs').insert({
          user_id: user.id,
          action: 'report_exported',
          metadata: { exportId, reportId, companyId, format, orientation, pageSize, whiteLabel },
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

        if (delivery.notifyByEmail && typeof delivery.email === 'string' && delivery.email.includes('@')) {
          await sendTemplatedEmailIfEnabled({
            admin,
            userId: user.id,
            templateType: 'export_ready',
            placeholders: {
              userName: delivery.email.split('@')[0] ?? 'there',
              companyName,
              exportUrl: exportUrl || exportPage,
            },
            metadata: { exportId, reportId, companyId, deliveryCopy: true },
            toOverride: delivery.email.trim(),
          })
        }
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
      }
    }

    const edgeRt = edgeRuntimeWaitUntil()
    if (edgeRt?.waitUntil) {
      edgeRt.waitUntil(runExport())
      return new Response(
        JSON.stringify({
          data: {
            exportId,
            status: 'queued',
            progress: 0,
            storagePath: null,
            signedUrl: null,
            format,
            message: 'Export queued — status updates in export jobs.',
          },
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await runExport()

    const { data: finalJob } = await admin.from('export_jobs').select('status, storage_path, error_message').eq('id', exportId).maybeSingle()
    const fj = finalJob ? asRecord(finalJob as Record<string, unknown>) : {}
    const finalStatus = typeof fj.status === 'string' ? fj.status : 'failed'
    if (finalStatus !== 'completed') {
      const em = typeof fj.error_message === 'string' ? fj.error_message : 'Export failed'
      return new Response(JSON.stringify({ error: em, exportId }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sp = typeof fj.storage_path === 'string' ? fj.storage_path : ''
    const signed = await admin.storage.from('report-exports').createSignedUrl(sp, 3600)

    return new Response(
      JSON.stringify({
        data: {
          exportId,
          status: 'completed',
          progress: 100,
          storagePath: sp,
          signedUrl: signed.data?.signedUrl ?? null,
          format,
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
