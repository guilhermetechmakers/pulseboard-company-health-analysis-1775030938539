import { supabase } from '@/lib/supabase'
import type { AnalyzeCompanyRequest } from '@/types/analysis'

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
