import { api } from '@/lib/api'
import type {
  CompanyDetailPayload,
  DashboardPayload,
  IntegrationActionInput,
  IntegrationConnection,
} from '@/types/integrations'

export const integrationsApi = {
  getDashboard: (companyId: string) =>
    api.get<DashboardPayload>(`/companies/${companyId}/dashboard`),
  getCompanyDetail: (companyId: string) =>
    api.get<CompanyDetailPayload>(`/companies/${companyId}/detail`),
  listConnections: (companyId: string) =>
    api.get<IntegrationConnection[]>(`/companies/${companyId}/integrations`),
  connect: ({ integrationId, companyId }: IntegrationActionInput) =>
    api.post<{ redirectUrl: string }>(`/integrations/${integrationId}/connect`, { companyId }),
  triggerSync: ({ integrationId, companyId }: IntegrationActionInput) =>
    api.post<{ jobId: string }>(`/integrations/${integrationId}/sync`, { companyId }),
}
