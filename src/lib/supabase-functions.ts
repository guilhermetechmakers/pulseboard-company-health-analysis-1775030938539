import { buildAuthenticatedEdgeHeaders } from '@/lib/pulseboard-request-headers'
import { supabase } from '@/lib/supabase'
import type { AnalyzeCompanyRequest } from '@/types/analysis'
import type { ExportDownloadUrlResponseData, ReportExportResponseData } from '@/types/export'
import type {
  PulseDataIoExportDownloadResponse,
  PulseDataIoExportResponse,
  PulseDataIoExportStatusResponse,
  PulseDataIoImportResponse,
  PulseDataIoImportStatusResponse,
} from '@/types/data-io'

export interface AnalyzeCompanyResponse {
  data: {
    reportId: string
    status: string
    analysisDepth?: string
    sourceModel?: string
  }
}

export interface ComputeHealthScoreResponse {
  data: {
    healthScore: {
      id: string
      company_id: string
      scored_at: string
      overall: number
      financial: number | null
      market: number | null
      brand_social: number | null
      source: string
    }
    breakdown: { financial: number; market: number; brandSocial: number; overall: number }
  }
}

export async function invokeComputeHealthScore(body: {
  companyId: string
  benchmarks?: Record<string, unknown>
  notes?: string
}): Promise<ComputeHealthScoreResponse> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/compute-health-score`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as ComputeHealthScoreResponse & { error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Health score request failed (${res.status})`
    throw new Error(errMsg)
  }

  if (!json.data?.healthScore?.id) {
    throw new Error('Invalid response from compute-health-score')
  }

  return json as ComputeHealthScoreResponse
}

export async function invokeAnalyzeCompanyHealth(
  body: AnalyzeCompanyRequest,
): Promise<AnalyzeCompanyResponse> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required to run analysis')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/analyze-company-health`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { data?: AnalyzeCompanyResponse['data']; error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Analysis request failed (${res.status})`
    throw new Error(errMsg)
  }

  if (!json.data?.reportId) {
    throw new Error('Invalid response from analysis service')
  }

  return json as AnalyzeCompanyResponse
}

export type AuthServerLogBody = {
  eventType: 'password_reset_requested' | 'password_reset_completed' | 'signup_telemetry'
  email?: string
  metadata?: Record<string, unknown>
}

/** Server-audited auth events (optional; fails silently if not deployed). */
export async function invokeAuthServerLog(body: AuthServerLogBody): Promise<void> {
  if (!supabase) return
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return

  const headers = await buildAuthenticatedEdgeHeaders()

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/auth-server-log`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      /* non-blocking */
    }
  } catch {
    /* non-blocking */
  }
}

export interface ReportExportRequestBody {
  reportId: string
  sections: string[]
  orientation: 'portrait' | 'landscape'
  format: 'pdf' | 'html'
  primaryColor?: string
  secondaryColor?: string
  language?: string
}

export async function invokeReportExport(
  body: ReportExportRequestBody,
): Promise<{ data: ReportExportResponseData }> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required to export reports')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/report-export`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { data?: ReportExportResponseData; error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Export request failed (${res.status})`
    throw new Error(errMsg)
  }

  if (!json.data?.exportId) {
    throw new Error('Invalid response from export service')
  }

  return json as { data: ReportExportResponseData }
}

export async function invokeExportDownloadUrl(input: {
  exportId: string
  expiresIn?: number
}): Promise<{ data: ExportDownloadUrlResponseData }> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/export-download-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ exportId: input.exportId, expiresIn: input.expiresIn ?? 3600 }),
  })

  const json = (await res.json()) as { data?: ExportDownloadUrlResponseData; error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Download URL request failed (${res.status})`
    throw new Error(errMsg)
  }

  if (!json.data?.signedUrl) {
    throw new Error('Invalid response from download service')
  }

  return json as { data: ExportDownloadUrlResponseData }
}

export async function invokeEmailSend(body: {
  templateType: 'verification' | 'password_reset' | 'analysis_complete' | 'export_ready' | 'billing_alert' | 'job_failed'
  placeholders?: Record<string, string>
}): Promise<{ data: { sent: boolean; skipped: boolean; reason: string | null; dispatchId: string | null } }> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/email-send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ templateType: body.templateType, placeholders: body.placeholders ?? {} }),
  })
  const json = (await res.json()) as {
    data?: { sent: boolean; skipped: boolean; reason: string | null; dispatchId: string | null }
    error?: unknown
  }
  if (!res.ok) {
    const errMsg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error ?? res.status)
    throw new Error(errMsg)
  }
  if (!json.data) {
    throw new Error('Invalid response from email-send')
  }
  return { data: json.data }
}

export async function invokeEmailRetry(outboundId: string): Promise<{ data: { ok: boolean; dispatchId: string | null } }> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/email-retry`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ outboundId }),
  })
  const json = (await res.json()) as { data?: { ok: boolean; dispatchId: string | null }; error?: unknown }
  if (!res.ok) {
    const errMsg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error ?? res.status)
    throw new Error(errMsg)
  }
  if (!json.data) {
    throw new Error('Invalid response from email-retry')
  }
  return { data: json.data }
}

export type SendTransactionalEmailBody = {
  templateType: string
  placeholders?: Record<string, string>
}

/** Authenticated Resend send via Edge Function (honors notification email preferences). */
export async function invokeSendTransactionalEmail(
  body: SendTransactionalEmailBody,
): Promise<{ data: Record<string, unknown> }> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { data?: Record<string, unknown>; error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Email request failed (${res.status})`
    throw new Error(errMsg)
  }

  return { data: json.data ?? {} }
}

/** Company API — guarded create + telemetry (`pulse-company-api` Edge Function). */
export async function invokePulseCompanyApi(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-company-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const err = json.error
    const errMsg = typeof err === 'string' ? err : JSON.stringify(err ?? res.status)
    const errObj = new Error(errMsg) as Error & { status?: number; body?: Record<string, unknown> }
    errObj.status = res.status
    errObj.body = json
    throw errObj
  }
  return json
}

export type PulseCompaniesApiBody = Record<string, unknown> & { op: string }

/** Company CRUD, drafts, completeness, telemetry (`pulse-companies-api` Edge Function). */
export async function invokePulseCompaniesApi<T = unknown>(body: PulseCompaniesApiBody): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-companies-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as T & {
    error?: string | Record<string, unknown>
  }
  if (!res.ok) {
    const e = json.error
    const msg =
      typeof e === 'string'
        ? e
        : e !== undefined && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : JSON.stringify(e ?? res.status)
    const err = new Error(msg) as Error & { status?: number; code?: string; remediation?: string }
    err.status = res.status
    if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
      err.code = (e as { code: string }).code
    }
    if (e && typeof e === 'object' && 'remediation' in e && typeof (e as { remediation: unknown }).remediation === 'string') {
      err.remediation = (e as { remediation: string }).remediation
    }
    throw err
  }
  return json as T
}

/** Admin platform (metrics, health, users, export). Requires profiles.role = admin. */
export async function invokeAdminApi(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/admin-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const err = json.error
    const errMsg = typeof err === 'string' ? err : JSON.stringify(err ?? res.status)
    throw new Error(errMsg)
  }
  return json
}

export type ClientErrorReportBody = {
  errorMessage: string
  stack?: string
  route?: string
  componentStack?: string
  correlationId?: string
}

export type PulseDataIoBody = Record<string, unknown> & { op: string }

/** Data import/export (CSV mapping, jobs, backups). Deploy `pulse-data-io` Edge Function. */
export async function invokePulseDataIo<T = unknown>(body: PulseDataIoBody): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-data-io`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as T & { error?: unknown }
  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `pulse-data-io failed (${res.status})`
    throw new Error(errMsg)
  }
  return json as T
}

export async function pulseDataIoImportCsv(payload: {
  companyId: string
  csvText: string
  targetModel: 'financials' | 'market' | 'social'
  fileName?: string
  mapping?: Record<string, string>
}): Promise<PulseDataIoImportResponse> {
  return invokePulseDataIo<PulseDataIoImportResponse>({
    op: 'import_csv',
    companyId: payload.companyId,
    csvText: payload.csvText,
    targetModel: payload.targetModel,
    fileName: payload.fileName ?? 'import.csv',
    mapping: payload.mapping ?? {},
  })
}

export async function pulseDataIoImportStatus(importJobId: string): Promise<PulseDataIoImportStatusResponse> {
  return invokePulseDataIo<PulseDataIoImportStatusResponse>({
    op: 'import_status',
    importJobId,
  })
}

export async function pulseDataIoImportRetry(importJobId: string): Promise<PulseDataIoImportResponse> {
  return invokePulseDataIo<PulseDataIoImportResponse>({
    op: 'import_retry',
    importJobId,
  })
}

export async function pulseDataIoExportCsv(payload: {
  companyId: string
  preset: 'full_backup' | 'selective' | 'compliance'
  format?: 'csv' | 'xlsx'
  fields?: string[]
  scheduleCadence?: string | null
}): Promise<PulseDataIoExportResponse> {
  return invokePulseDataIo<PulseDataIoExportResponse>({
    op: 'export_csv',
    companyId: payload.companyId,
    preset: payload.preset,
    format: payload.format ?? 'csv',
    fields: payload.fields ?? [],
    scheduleCadence: payload.scheduleCadence ?? null,
  })
}

export async function pulseDataIoExportStatus(exportJobId: string): Promise<PulseDataIoExportStatusResponse> {
  return invokePulseDataIo<PulseDataIoExportStatusResponse>({
    op: 'export_status',
    exportJobId,
  })
}

export async function pulseDataIoExportDownload(exportJobId: string): Promise<PulseDataIoExportDownloadResponse> {
  return invokePulseDataIo<PulseDataIoExportDownloadResponse>({
    op: 'export_download',
    exportJobId,
  })
}

/** Reports UI errors to Edge Function (audit_logs + optional webhook). Non-blocking. */
export async function invokeClientErrorReport(body: ClientErrorReportBody): Promise<void> {
  if (!supabase) return
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    apikey: anon,
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/client-error-report`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        errorMessage: body.errorMessage,
        stack: body.stack,
        route: body.route,
        componentStack: body.componentStack,
        correlationId: body.correlationId,
      }),
    })
    if (!res.ok) {
      /* non-blocking */
    }
  } catch {
    /* non-blocking */
  }
}

export type PulseActiveCompanyBody =
  | { action: 'resolve' }
  | { action: 'sync_context'; companyId: string }

/** Resolve or sync active company context (`pulse-active-company` Edge Function). */
export async function invokePulseActiveCompany(body: PulseActiveCompanyBody): Promise<Record<string, unknown>> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new Error('Sign in required')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-active-company`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const err = json.error
    const errMsg = typeof err === 'string' ? err : JSON.stringify(err ?? res.status)
    throw new Error(errMsg)
  }
  return json
}
