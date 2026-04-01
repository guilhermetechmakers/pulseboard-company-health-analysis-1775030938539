import { invokePulseActiveCompany } from '@/lib/supabase-functions'

export type ResolveActiveCompanyData = {
  activeCompanyId: string | null
  companyName: string | null
  singleCompanyModeEnabled: boolean
  lastContextCompanyId: string | null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Edge Function: mirrors POST /auth/resolve-active-company product contract. */
export async function resolveActiveCompany(): Promise<ResolveActiveCompanyData> {
  const raw = await invokePulseActiveCompany({ action: 'resolve' })
  const r = isRecord(raw) ? raw : {}
  const data = isRecord(r.data) ? r.data : r
  const activeCompanyId = typeof data.activeCompanyId === 'string' ? data.activeCompanyId : null
  const companyName = typeof data.companyName === 'string' ? data.companyName : null
  const singleCompanyModeEnabled = data.singleCompanyModeEnabled !== false
  const lastContextCompanyId =
    typeof data.lastContextCompanyId === 'string' ? data.lastContextCompanyId : null
  return { activeCompanyId, companyName, singleCompanyModeEnabled, lastContextCompanyId }
}

export async function syncActiveCompanyContext(companyId: string): Promise<void> {
  await invokePulseActiveCompany({ action: 'sync_context', companyId })
}
