import { supabase } from '@/lib/supabase'

export class PulseSearchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PulseSearchError'
    this.status = status
  }
}

/**
 * Calls deployed `pulse-search` Edge Function (authenticated).
 * All ops use POST JSON { op, ... } for consistent CORS and bodies.
 */
export async function invokePulseSearch<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  if (!supabase) {
    throw new PulseSearchError('Supabase is not configured', 503)
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new PulseSearchError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY', 503)
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new PulseSearchError('Sign in required', 401)
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/pulse-search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  const json = (await res.json()) as T & { error?: unknown }

  if (!res.ok) {
    const errMsg =
      typeof json.error === 'string'
        ? json.error
        : json.error !== undefined
          ? JSON.stringify(json.error)
          : `Search request failed (${res.status})`
    throw new PulseSearchError(errMsg, res.status)
  }

  return json as T
}
