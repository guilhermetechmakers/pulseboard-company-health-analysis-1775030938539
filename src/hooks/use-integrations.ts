import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi } from '@/api/integrations'

const DEFAULT_COMPANY_ID = 'active'

export function useDashboardData(companyId: string = DEFAULT_COMPANY_ID) {
  return useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: () => integrationsApi.getDashboard(companyId),
  })
}

export function useCompanyDetailData(companyId: string = DEFAULT_COMPANY_ID) {
  return useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: () => integrationsApi.getCompanyDetail(companyId),
  })
}

export function useIntegrationConnections(companyId: string = DEFAULT_COMPANY_ID) {
  return useQuery({
    queryKey: ['integration-connections', companyId],
    queryFn: () => integrationsApi.listConnections(companyId),
  })
}

export function useConnectIntegration(companyId: string = DEFAULT_COMPANY_ID) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (integrationId: string) => integrationsApi.connect({ integrationId, companyId }),
    onSuccess: async () => {
      toast.success('Integration connected. Permissions granted.')
      await queryClient.invalidateQueries({ queryKey: ['integration-connections', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard', companyId] })
    },
    onError: () => {
      toast.error('Unable to complete OAuth connection.')
    },
  })
}

export function useTriggerSync(companyId: string = DEFAULT_COMPANY_ID) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (integrationId: string) => integrationsApi.triggerSync({ integrationId, companyId }),
    onMutate: () => {
      toast.loading('Sync started', { id: 'integration-sync' })
    },
    onSuccess: async () => {
      toast.success('Sync queued successfully.', { id: 'integration-sync' })
      await queryClient.invalidateQueries({ queryKey: ['integration-connections', companyId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard', companyId] })
    },
    onError: () => {
      toast.error('Sync failed to start.', { id: 'integration-sync' })
    },
  })
}
