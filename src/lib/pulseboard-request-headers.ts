import { supabase } from '@/lib/supabase'
import { readStoredActiveCompanyId } from '@/lib/active-company-storage'

/** Canonical + legacy header for gradual client rollout. */
const ACTIVE_HEADER = 'X-Active-Company-Id'
const LEGACY_ACTIVE_HEADER = 'X-PulseBoard-Active-Company-Id'

/**
 * Standard headers for authenticated Supabase Edge Function calls, including optional active-company scope.
 */
export async function buildAuthenticatedEdgeHeaders(): Promise<Record<string, string>> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  const headers: Record<string, string> = {
    apikey: anon,
    'Content-Type': 'application/json',
  }

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const companyId = readStoredActiveCompanyId()
  if (companyId) {
    headers[ACTIVE_HEADER] = companyId
    headers[LEGACY_ACTIVE_HEADER] = companyId
  }

  return headers
}

export { ACTIVE_HEADER, LEGACY_ACTIVE_HEADER }
