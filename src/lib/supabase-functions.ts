import { supabase } from '@/lib/supabase'
import type { AnalyzeCompanyRequest } from '@/types/analysis'
import type { ExportDownloadUrlResponseData, ReportExportResponseData } from '@/types/export'

export interface AnalyzeCompanyResponse {
  data: {
    reportId: string
    status: string
    analysisDepth?: string
    sourceModel?: string
  }
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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sign in required to run analysis')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/analyze-company-health`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sign in required to export reports')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/report-export`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sign in required')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/export-download-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
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
