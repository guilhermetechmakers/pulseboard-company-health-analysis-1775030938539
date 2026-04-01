import { supabase } from '@/lib/supabase'
import { buildAuthenticatedEdgeHeaders } from '@/lib/pulseboard-request-headers'
import {
  parseAnalysisStatusResponse,
  parseCreateAnalysisResponse,
} from '@/lib/analysis-response-validators'
import {
  advanceMockAnalysisJob,
  createMockAnalysisJob,
  readMockAnalysisJob,
} from '@/lib/mock-analysis-pipeline'
import type {
  AnalysisStatusResponseData,
  CreateAnalysisRequestBody,
  CreateAnalysisResponseData,
  NotificationTriggerBody,
} from '@/types/analysis-job'

export class AnalysisApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AnalysisApiError'
    this.status = status
  }
}

/** POST /api/analyses — `pulse-analyses-api` Edge Function. */
export async function createAnalysisRecord(body: CreateAnalysisRequestBody): Promise<CreateAnalysisResponseData> {
  if (!supabase) {
    return createMockAnalysisJob()
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new AnalysisApiError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new AnalysisApiError('Sign in required', 401)
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-analyses-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      companyId: body.companyId,
      depth: body.depth,
      includeBenchmarks: body.includeBenchmarks,
      sendToEmail: body.sendToEmail,
      email: body.email ?? null,
      consentGiven: body.consentGiven,
    }),
  })

  const json = (await res.json()) as unknown
  if (!res.ok) {
    const err =
      json !== null && typeof json === 'object' && !Array.isArray(json) && 'error' in json
        ? (json as { error: unknown }).error
        : null
    const msg =
      typeof err === 'string'
        ? err
        : err !== undefined
          ? JSON.stringify(err)
          : `createAnalysis failed (${res.status})`
    throw new AnalysisApiError(msg, res.status)
  }

  const parsed = parseCreateAnalysisResponse(json)
  if (!parsed) {
    throw new AnalysisApiError('Invalid response from pulse-analyses-api')
  }
  return parsed
}

/** Alias for hooks that use the shorter name. */
export const createAnalysisJob = createAnalysisRecord

/** GET /api/analyses/:id — `pulse-analyses-api?analysisId=`. */
export async function getAnalysisStatus(analysisId: string): Promise<AnalysisStatusResponseData> {
  if (!analysisId) {
    throw new AnalysisApiError('analysisId required', 400)
  }

  if (!supabase) {
    const advanced = advanceMockAnalysisJob(analysisId)
    if (advanced) return advanced
    const cur = readMockAnalysisJob(analysisId)
    if (cur) return cur
    throw new AnalysisApiError('Unknown mock analysis id', 404)
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new AnalysisApiError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new AnalysisApiError('Sign in required', 401)
  }

  const qs = new URLSearchParams({ analysisId })
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-analyses-api?${qs.toString()}`, {
    method: 'GET',
    headers,
  })

  const json = (await res.json()) as unknown
  if (!res.ok) {
    const err =
      json !== null && typeof json === 'object' && !Array.isArray(json) && 'error' in json
        ? (json as { error: unknown }).error
        : null
    const msg = typeof err === 'string' ? err : JSON.stringify(err ?? res.status)
    throw new AnalysisApiError(msg, res.status)
  }

  const parsed = parseAnalysisStatusResponse(json)
  if (!parsed) {
    throw new AnalysisApiError('Invalid analysis status response')
  }
  return parsed
}

export const fetchAnalysisStatus = getAnalysisStatus

/** Maps job API rows to the shape expected by `useGenerateAnalysisJob`. */
export async function fetchAnalysisJobStatus(analysisId: string): Promise<AnalysisStatusResponseData> {
  return getAnalysisStatus(analysisId)
}

/** POST /api/notifications/trigger — `pulse-notifications-trigger`. */
export async function triggerNotification(body: NotificationTriggerBody): Promise<{ notificationId: string; inboxItemId: string }> {
  if (!supabase) {
    return { notificationId: 'mock', inboxItemId: 'mock' }
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new AnalysisApiError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const headers = await buildAuthenticatedEdgeHeaders()
  if (!headers.Authorization?.startsWith('Bearer ')) {
    throw new AnalysisApiError('Sign in required', 401)
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-notifications-trigger`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as unknown
  if (!res.ok) {
    const err =
      json !== null && typeof json === 'object' && !Array.isArray(json) && 'error' in json
        ? (json as { error: unknown }).error
        : null
    const msg = typeof err === 'string' ? err : JSON.stringify(err ?? res.status)
    throw new AnalysisApiError(msg, res.status)
  }

  if (json === null || typeof json !== 'object' || Array.isArray(json) || !('data' in json)) {
    throw new AnalysisApiError('Invalid notification trigger response')
  }
  const d = (json as { data: unknown }).data
  if (d === null || typeof d !== 'object' || Array.isArray(d)) {
    throw new AnalysisApiError('Invalid notification trigger payload')
  }
  const row = d as Record<string, unknown>
  const notificationId = typeof row.notificationId === 'string' ? row.notificationId : ''
  const inboxItemId = typeof row.inboxItemId === 'string' ? row.inboxItemId : ''
  if (!notificationId) {
    throw new AnalysisApiError('Invalid notification trigger payload')
  }
  return { notificationId, inboxItemId }
}
