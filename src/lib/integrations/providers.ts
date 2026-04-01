import { api } from '@/lib/api'
import type { IntegrationConnector } from '@/lib/integrations/interface'

interface ProviderRecord {
  [key: string]: unknown
}

function toSafeArray(data: unknown): ProviderRecord[] {
  return Array.isArray(data) ? data.filter((item) => item && typeof item === 'object') as ProviderRecord[] : []
}

function createConnector(provider: 'ga4' | 'quickbooks' | 'linkedin' | 'stripe'): IntegrationConnector<ProviderRecord, ProviderRecord> {
  return {
    provider,
    authenticate: async () => api.post<{ authorizationUrl: string }>(`/integrations/${provider}/oauth/start`, {}),
    getCredentials: async (companyId) => api.get(`/companies/${companyId}/integrations/${provider}/credentials`),
    testConnection: async (companyId) => api.get(`/companies/${companyId}/integrations/${provider}/test`),
    fetchData: async (companyId) => {
      const response = await api.get<{ data: unknown }>(`/companies/${companyId}/integrations/${provider}/data`)
      return toSafeArray(response?.data)
    },
    transformData: (items) => toSafeArray(items).map((item) => ({ ...item, provider })),
    scheduleSync: async (companyId, cadence) => {
      await api.post(`/companies/${companyId}/integrations/${provider}/schedule`, { cadence })
    },
  }
}

export const connectors = {
  ga4: createConnector('ga4'),
  quickbooks: createConnector('quickbooks'),
  linkedin: createConnector('linkedin'),
  stripe: createConnector('stripe'),
}
