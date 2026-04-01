import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { IntegrationRow } from '@/types/integrations'
import type { IntegrationProvider } from '@/types/integrations'

export function useIntegrations(companyId: string | undefined) {
  return useQuery({
    queryKey: ['integrations', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: async (): Promise<IntegrationRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', companyId)
        .order('provider')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useEnsureIntegrationMutation(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (provider: IntegrationProvider) => {
      if (!supabase || !companyId) throw new Error('Not ready')
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .maybeSingle()
      if (existing?.id) return existing.id
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          company_id: companyId,
          provider,
          status: provider === 'csv' ? 'connected' : 'disconnected',
          cadence: 'daily',
          scopes: [],
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['integrations', companyId] })
    },
  })
}
