/**
 * Pulse cache (Edge Function `pulse-cache-api` + optional browser TTL layer).
 * Conceptual REST mapping: GET /api/companies/:id/profile|health|analyses, GET /api/analyses/:id/report
 */

export type PulseCacheRequest =
  | { op: 'get_company_profile'; companyId: string; bustCache?: boolean }
  | { op: 'get_company_health'; companyId: string; analysisId?: string; limit?: number; bustCache?: boolean }
  | { op: 'get_company_analyses'; companyId: string; bustCache?: boolean }
  | { op: 'get_report'; reportId: string; bustCache?: boolean }
  | { op: 'invalidate_company'; companyId: string }
  | { op: 'invalidate_report'; reportId: string; companyId?: string }
  | { op: 'cache_stats' }

export interface PulseCacheMeta {
  cacheHit: boolean
  ttlSeconds: number
  /** Origin of payload: edge isolate cache, fresh DB read, or browser module cache */
  source?: 'cache' | 'origin' | 'client'
  cachedAt?: string | null
  /** Approximate soft-stale time for UI hints */
  staleAt?: string
  cacheKey?: string
}

export interface PulseCacheEnvelope<T> {
  data: T | null
  error: string | null
  meta: PulseCacheMeta | null
}
