import { invokeClientErrorReport } from '@/lib/supabase-functions'

const STORAGE_PREFIX = 'pb_err_fp_'
const THROTTLE_MS = 60_000

function fingerprint(message: string, route: string): string {
  const m = message.slice(0, 160)
  const r = route.slice(0, 200)
  return `${m}::${r}`
}

/**
 * Dedupes rapid repeats in-session; never throws. Edge Function applies additional throttling.
 */
export function reportClientRuntimeError(input: {
  error: Error
  route?: string
  componentStack?: string | null
}): void {
  const route =
    input.route ??
    (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location
      ? String((globalThis.location as Location).pathname)
      : '')
  const message = input.error?.message ? String(input.error.message) : 'Unknown error'
  const fp = fingerprint(message, route)

  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = STORAGE_PREFIX + fp
      const lastRaw = sessionStorage.getItem(key)
      const now = Date.now()
      if (lastRaw !== null) {
        const last = Number(lastRaw)
        if (Number.isFinite(last) && now - last < THROTTLE_MS) {
          return
        }
      }
      sessionStorage.setItem(key, String(now))
    }
  } catch {
    /* ignore storage */
  }

  const correlationId =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis && globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  void invokeClientErrorReport({
    errorMessage: message,
    stack: typeof input.error?.stack === 'string' ? input.error.stack : undefined,
    route,
    componentStack: input.componentStack ?? undefined,
    correlationId,
  })
}
