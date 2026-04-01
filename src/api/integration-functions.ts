import { supabase } from '@/lib/supabase'
import type { IntegrationProvider } from '@/types/integrations'

export interface OAuthStartResponse {
  authUrl?: string
  state?: string
  mode?: string
  message?: string
}

export async function integrationOAuthStart(
  companyId: string,
  provider: IntegrationProvider,
  redirectUri: string,
): Promise<OAuthStartResponse> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke<OAuthStartResponse>('integration-oauth', {
    body: { action: 'start', companyId, provider, redirectUri },
  })
  if (error) throw error
  return data ?? {}
}

export async function integrationOAuthExchange(
  companyId: string,
  provider: IntegrationProvider,
  code: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'integration-oauth',
    {
      body: { action: 'exchange', companyId, provider, code },
    },
  )
  if (error) throw error
  return data ?? {}
}

export async function integrationSync(integrationId: string): Promise<{ ok?: boolean; jobId?: string; error?: string }> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; jobId?: string; error?: string }>(
    'integration-sync',
    { body: { integrationId } },
  )
  if (error) throw error
  return data ?? {}
}

export async function csvImportRequest(payload: {
  companyId: string
  csvText: string
  targetModel: 'financials' | 'market' | 'social'
  fileName?: string
}): Promise<{ ok?: boolean; uploadId?: string; rowsProcessed?: number; error?: string }> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('csv-import', { body: payload })
  if (error) throw error
  return (data ?? {}) as { ok?: boolean; uploadId?: string; rowsProcessed?: number; error?: string }
}
