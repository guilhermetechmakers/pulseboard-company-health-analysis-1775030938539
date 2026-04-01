import type { IntegrationProvider } from '@/types/integrations'

export interface ConnectorCredentials {
  accessToken: string
  refreshToken?: string | null
  expiresAt?: string | null
}

export interface ConnectorSyncResult<TData> {
  provider: IntegrationProvider
  records: TData[]
  lastSyncedAt: string
  hasPartialFailures: boolean
}

export interface IntegrationConnector<TExternal = unknown, TInternal = unknown> {
  provider: IntegrationProvider
  authenticate: () => Promise<{ authorizationUrl: string }>
  getCredentials: (companyId: string) => Promise<ConnectorCredentials | null>
  testConnection: (companyId: string) => Promise<{ isValid: boolean; message: string }>
  fetchData: (companyId: string) => Promise<TExternal[]>
  transformData: (items: TExternal[]) => TInternal[]
  scheduleSync: (companyId: string, cadence: 'hourly' | 'daily' | 'manual') => Promise<void>
}
