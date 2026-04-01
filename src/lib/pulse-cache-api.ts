import { supabase } from '@/lib/supabase'
import {
  clientCacheDel,
  clientCacheGet,
  clientCacheSet,
  PULSE_CLIENT_TTL_MS,
  pulseClientInvalidateCompany,
} from '@/lib/client-memory-cache'
import type { PulseCacheEnvelope, PulseCacheMeta, PulseCacheRequest } from '@/types/pulse-cache'

function requestClientKey(body: PulseCacheRequest): string | null {
  switch (body.op) {
    case 'get_company_profile':
      return `pulse:agg:${body.companyId}`
    case 'get_company_health':
      return `pulse:health:${body.companyId}:${body.limit ?? 24}:${body.analysisId ?? 'all'}`
    case 'get_company_analyses':
      return `pulse:reports:${body.companyId}`
    case 'get_report':
      return `pulse:report:${body.reportId}`
    default:
      return null
  }
}

function clientTtlMs(body: PulseCacheRequest): number {
  switch (body.op) {
    case 'get_company_profile':
      return PULSE_CLIENT_TTL_MS.aggregates
    case 'get_company_health':
      return PULSE_CLIENT_TTL_MS.health
    case 'get_company_analyses':
      return PULSE_CLIENT_TTL_MS.analyses
    case 'get_report':
      return PULSE_CLIENT_TTL_MS.report
    default:
      return 0
  }
}

function clientHitMeta(body: PulseCacheRequest, key: string): PulseCacheMeta {
  const ttlMs = clientTtlMs(body)
  const ttlSeconds = ttlMs / 1000
  const t = new Date().toISOString()
  return {
    cacheHit: true,
    ttlSeconds,
    source: 'client',
    cachedAt: t,
    staleAt: new Date(Date.now() + ttlMs).toISOString(),
    cacheKey: key,
  }
}

function isReadableOp(op: PulseCacheRequest['op']): op is 'get_company_profile' | 'get_company_health' | 'get_company_analyses' | 'get_report' {
  return op === 'get_company_profile' || op === 'get_company_health' || op === 'get_company_analyses' || op === 'get_report'
}

function enrichPulseMeta(meta: PulseCacheMeta | null): PulseCacheMeta | null {
  if (!meta) return null
  if (meta.staleAt) return meta
  const ts = typeof meta.cachedAt === 'string' ? Date.parse(meta.cachedAt) : Number.NaN
  if (Number.isFinite(ts) && meta.ttlSeconds > 0) {
    return { ...meta, staleAt: new Date(ts + meta.ttlSeconds * 1000).toISOString() }
  }
  return meta
}

export async function invokePulseCacheApi<T>(body: PulseCacheRequest): Promise<PulseCacheEnvelope<T>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured', meta: null }
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { data: null, error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY', meta: null }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return { data: null, error: 'Sign in required', meta: null }
  }

  const cacheKey = requestClientKey(body)
  const bustCache =
    isReadableOp(body.op) && 'bustCache' in body && body.bustCache === true
  if (isReadableOp(body.op) && bustCache && cacheKey) {
    clientCacheDel(cacheKey)
  } else if (cacheKey && isReadableOp(body.op) && !bustCache) {
    const hit = clientCacheGet<T>(cacheKey)
    if (hit !== null) {
      return { data: hit, error: null, meta: clientHitMeta(body, cacheKey) }
    }
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-cache-api`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as PulseCacheEnvelope<T> & { error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `pulse-cache-api failed (${res.status})`
    return { data: null, error: errMsg, meta: null }
  }

  if (json.error && typeof json.error === 'string') {
    return { data: json.data ?? null, error: json.error, meta: json.meta ?? null }
  }

  const out: PulseCacheEnvelope<T> = {
    data: json.data ?? null,
    error: null,
    meta: enrichPulseMeta(json.meta ?? null),
  }

  if (out.data !== null && cacheKey && isReadableOp(body.op)) {
    clientCacheSet(cacheKey, out.data, clientTtlMs(body))
  }

  return out
}

/** Non-blocking server + browser cache invalidation after client writes. */
export function fireAndForgetInvalidateCompanyCache(companyId: string): void {
  pulseClientInvalidateCompany(companyId)
  void invokePulseCacheApi({ op: 'invalidate_company', companyId }).catch(() => {
    /* optional edge */
  })
}

export function fireAndForgetInvalidateReportCache(reportId: string, companyId?: string): void {
  clientCacheDel(`pulse:report:${reportId}`)
  if (companyId) pulseClientInvalidateCompany(companyId)
  void invokePulseCacheApi({ op: 'invalidate_report', reportId, companyId }).catch(() => {
    /* optional edge */
  })
}
