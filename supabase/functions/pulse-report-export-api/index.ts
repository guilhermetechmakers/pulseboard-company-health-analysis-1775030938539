/**
 * PulseBoard — unified report export API surface (status polling, export context for UI gating, email delivery).
 * Mirrors REST: GET export-status, POST export-email, GET export context. All ops use POST body + JWT.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'
import { asRecord } from '../_shared/safe-json.ts'
import { sendTemplatedEmailIfEnabled } from '../_shared/transactional-email.ts'

const requestSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('export_context'),
    reportId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('export_status'),
    reportId: z.string().uuid(),
    exportId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('export_email'),
    reportId: z.string().uuid(),
    exportId: z.string().uuid(),
    email: z.string().email(),
  }),
])

async function assertReportCompany(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reportId: string,
): Promise<string | null> {
  const { data: report, error } = await supabase.from('reports').select('company_id').eq('id', reportId).maybeSingle()
  if (error || !report) return null
  const companyId = typeof (report as { company_id?: string }).company_id === 'string'
    ? (report as { company_id: string }).company_id
    : ''
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!company) return null
  return companyId
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify({ data, error: null }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonErr(message: string, status: number) {
  return new Response(JSON.stringify({ data: null, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonErr('Method not allowed', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!serviceKey) {
      return jsonErr('Server misconfigured', 500)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return jsonErr('Unauthorized', 401)
    }

    const jsonBody = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(jsonBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ data: null, error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = parsed.data
    const admin = createClient(supabaseUrl, serviceKey)

    if (body.op === 'export_context') {
      const companyId = await assertReportCompany(userClient, user.id, body.reportId)
      if (!companyId) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scopeBlock) return scopeBlock

      const { data: profile } = await admin.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle()
      const tier =
        profile && typeof (profile as { plan_tier?: string }).plan_tier === 'string'
          ? (profile as { plan_tier: string }).plan_tier
          : 'starter'
      const whiteLabelAllowed = tier === 'pro' || tier === 'agency'

      return jsonOk({
        reportId: body.reportId,
        planTier: tier,
        whiteLabelAllowed,
      })
    }

    if (body.op === 'export_status') {
      const companyId = await assertReportCompany(userClient, user.id, body.reportId)
      if (!companyId) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scopeBlock) return scopeBlock

      const { data: job, error: jErr } = await userClient
        .from('export_jobs')
        .select('id, report_id, status, progress, storage_path, error_message, file_size_bytes, export_params, updated_at')
        .eq('id', body.exportId)
        .maybeSingle()

      if (jErr || !job) {
        return jsonErr('Export not found or access denied', 404)
      }

      const row = asRecord(job as Record<string, unknown>)
      if (row.report_id !== body.reportId) {
        return jsonErr('Export does not belong to this report', 400)
      }

      const status = typeof row.status === 'string' ? row.status : 'unknown'
      const progress = typeof row.progress === 'number' && Number.isFinite(row.progress) ? row.progress : 0
      const storagePath = typeof row.storage_path === 'string' ? row.storage_path : null
      const errMsg = typeof row.error_message === 'string' ? row.error_message : null
      const fileSize =
        typeof row.file_size_bytes === 'number' && Number.isFinite(row.file_size_bytes) ? row.file_size_bytes : null

      let downloadUrl: string | null = null
      if (status === 'completed' && storagePath) {
        const signed = await admin.storage.from('report-exports').createSignedUrl(storagePath, 3600)
        downloadUrl = signed.data?.signedUrl ?? null
      }

      return jsonOk({
        exportId: body.exportId,
        reportId: body.reportId,
        status,
        progress,
        downloadUrl,
        errorMessage: errMsg,
        fileSizeBytes: fileSize,
      })
    }

    if (body.op === 'export_email') {
      const companyId = await assertReportCompany(userClient, user.id, body.reportId)
      if (!companyId) return jsonErr('Report not found or access denied', 404)
      const scopeBlock = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scopeBlock) return scopeBlock

      const { data: job, error: jErr } = await userClient
        .from('export_jobs')
        .select('id, report_id, status, storage_path')
        .eq('id', body.exportId)
        .maybeSingle()

      if (jErr || !job) {
        return jsonErr('Export not found or access denied', 404)
      }

      const row = asRecord(job as Record<string, unknown>)
      if (row.report_id !== body.reportId) {
        return jsonErr('Export does not belong to this report', 400)
      }

      const status = typeof row.status === 'string' ? row.status : ''
      const storagePath = typeof row.storage_path === 'string' ? row.storage_path : ''
      if (status !== 'completed' || !storagePath) {
        return jsonErr('Export is not ready for email delivery', 409)
      }

      const signed = await admin.storage.from('report-exports').createSignedUrl(storagePath, 7200)
      const exportUrl = signed.data?.signedUrl ?? ''
      const { data: company } = await userClient.from('companies').select('name').eq('id', companyId).maybeSingle()
      const companyName =
        company && typeof (company as { name?: string }).name === 'string' ? (company as { name: string }).name : 'Company'

      const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
      const exportPage = appUrl ? `${appUrl}/export/${body.reportId}` : `/export/${body.reportId}`

      const sendRes = await sendTemplatedEmailIfEnabled({
        admin,
        userId: user.id,
        templateType: 'export_ready',
        placeholders: {
          userName: body.email.split('@')[0] ?? 'there',
          companyName,
          exportUrl: exportUrl || exportPage,
        },
        metadata: { exportId: body.exportId, reportId: body.reportId, manualSend: true },
        toOverride: body.email.trim(),
      })

      if (!sendRes.sent && sendRes.skipped) {
        return jsonOk({
          success: false,
          message: sendRes.reason ?? 'Email was not sent',
        })
      }

      return jsonOk({
        success: true,
        message: 'Export link sent by email',
      })
    }

    return jsonErr('Unsupported operation', 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error'
    return jsonErr(msg, 500)
  }
})
