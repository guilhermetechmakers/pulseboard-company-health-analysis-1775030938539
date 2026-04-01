/**
 * Session-scoped cache for Report Viewer reads (complements Edge TTL cache + React Query).
 */

const PREFIX = 'pulse:rv:'

function storageKey(reportId: string, subKey: string): string {
  return `${PREFIX}${reportId}:${subKey}`
}

export type ReportViewerCacheEntry<T> = { value: T; expiresAt: number }

export function readReportViewerCache<T>(reportId: string, subKey: string): T | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(reportId, subKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReportViewerCacheEntry<T>
    if (!parsed || typeof parsed.expiresAt !== 'number') return null
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(storageKey(reportId, subKey))
      return null
    }
    return parsed.value ?? null
  } catch {
    return null
  }
}

export function writeReportViewerCache<T>(reportId: string, subKey: string, value: T, ttlMs: number): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const entry: ReportViewerCacheEntry<T> = { value, expiresAt: Date.now() + ttlMs }
    sessionStorage.setItem(storageKey(reportId, subKey), JSON.stringify(entry))
  } catch {
    /* quota / private mode */
  }
}

export function clearReportViewerCache(reportId: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(`${PREFIX}${reportId}:`)) keys.push(k)
    }
    for (const k of keys) sessionStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}
