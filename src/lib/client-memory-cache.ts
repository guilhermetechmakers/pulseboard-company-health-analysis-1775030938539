/**
 * Short-TTL browser cache for pulse-cache-api reads — cuts duplicate Edge calls during navigation.
 */

interface Entry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

function now(): number {
  return Date.now()
}

export function clientCacheGet<T>(key: string): T | null {
  const e = store.get(key)
  if (!e) return null
  if (now() >= e.expiresAt) {
    store.delete(key)
    return null
  }
  try {
    return structuredClone(e.value) as T
  } catch {
    return JSON.parse(JSON.stringify(e.value)) as T
  }
}

export function clientCacheSet<T>(key: string, value: T, ttlMs: number): void {
  try {
    const v = JSON.parse(JSON.stringify(value)) as T
    store.set(key, { value: v, expiresAt: now() + ttlMs })
  } catch {
    /* non-serializable */
  }
}

export function clientCacheDel(key: string): void {
  store.delete(key)
}

export function clientCacheDeletePrefix(prefix: string): void {
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}

/** TTLs slightly below Edge TTLs to prefer revalidation at the Edge. */
export const PULSE_CLIENT_TTL_MS = {
  aggregates: 70_000,
  health: 35_000,
  analyses: 50_000,
  report: 100_000,
} as const

export function pulseClientInvalidateCompany(companyId: string): void {
  clientCacheDel(`pulse:agg:${companyId}`)
  clientCacheDel(`pulse:reports:${companyId}`)
  clientCacheDeletePrefix(`pulse:health:${companyId}:`)
}
