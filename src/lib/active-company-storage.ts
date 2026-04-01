/**
 * Persists the active company id for single-company mode so native fetch wrappers can send
 * `X-Active-Company-Id` (defense-in-depth with Edge Functions). Session + localStorage keep
 * tab-scoped preference with cross-tab fallback after refresh.
 */
const STORAGE_KEY = 'pulseboard_active_company_id'

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function readStoredActiveCompanyId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const session = sessionStorage.getItem(STORAGE_KEY)
    const local = localStorage.getItem(STORAGE_KEY)
    const raw = session ?? local ?? ''
    const trimmed = raw.trim()
    if (!trimmed || !isLikelyUuid(trimmed)) return null
    return trimmed
  } catch {
    return null
  }
}

export function persistActiveCompanyId(companyId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    if (!companyId || !isLikelyUuid(companyId)) {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, companyId)
    localStorage.setItem(STORAGE_KEY, companyId)
  } catch {
    /* quota / private mode */
  }
}

/** Optional header map for Edge Function calls (empty when unset). */
export function activeCompanyIdHeaders(companyIdFromBody?: string | null): Record<string, string> {
  const stored = readStoredActiveCompanyId()
  const id = stored ?? (companyIdFromBody && isLikelyUuid(companyIdFromBody) ? companyIdFromBody : null)
  if (!id) return {}
  return { 'X-Active-Company-Id': id }
}

/** Clears session + local active company id (e.g. on sign-out). */
export function clearActiveCompanyPersistence(): void {
  persistActiveCompanyId(null)
}
