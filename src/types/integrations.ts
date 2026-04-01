import type { Database } from '@/types/database'

export type IntegrationProvider = 'ga4' | 'quickbooks' | 'linkedin' | 'stripe' | 'csv'

export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type IntegrationRow = Database['public']['Tables']['integrations']['Row']
export type SyncJobRow = Database['public']['Tables']['sync_jobs']['Row']
export type CsvUploadRow = Database['public']['Tables']['csv_uploads']['Row']

export const INTEGRATION_PROVIDERS: {
  id: IntegrationProvider
  label: string
  description: string
  scopes: string[]
}[] = [
  {
    id: 'ga4',
    label: 'Google Analytics (GA4)',
    description: 'Sessions, users, pageviews, bounce rate, traffic sources, device and geo breakdowns.',
    scopes: ['analytics.readonly'],
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks Online',
    description: 'Revenue, expenses, balance sheet hints, and period-based financial snapshots.',
    scopes: ['com.intuit.quickbooks.accounting'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Pages',
    description: 'Followers, impressions, engagement, and post-level metrics with pagination.',
    scopes: ['r_organization_social', 'r_organization_followers'],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Subscriptions, invoices, payments, and customer balance via Connect + webhooks.',
    scopes: ['read_write (Connect)'],
  },
  {
    id: 'csv',
    label: 'CSV upload',
    description: 'Import financials, market rows, or social channel metrics with column mapping.',
    scopes: ['File upload (in-app)'],
  },
]

/** Legacy REST-shaped types for `src/api/integrations.ts` (optional backend bridge). */
export interface IntegrationConnection {
  id: string
  provider: IntegrationProvider
  status: 'disconnected' | 'connected' | 'syncing' | 'error'
  scopes: string[]
  cadence: string
  lastSyncedAt: string | null
  nextSyncAt: string | null
  updatedAt: string
}

export interface SyncHistoryItem {
  id: string
  provider: string
  status: string
  recordsSynced?: number
  errorMessage?: string | null
}

export interface DashboardPayload {
  hasCompany: boolean
  companyName: string | null
  healthScore: number
  completeness: number
  staleSignals: string[]
  latestAnalyses: { id: string; title: string; createdAt: string; score: number }[]
  integrations: IntegrationConnection[]
  syncHistory: SyncHistoryItem[]
}

export interface CompanyDetailPayload {
  id: string
  name: string
  industry: string | null
  website: string | null
  goals: string | null
  healthBreakdown: { financial: number; market: number; social: number }
  lastUpdatedAt: string | null
  financials: { label: string; value: number | null }[]
  market: { competitor: string; threatLevel: string; opportunity: string }[]
  social: { channel: string; followers: number | null; engagementRate: number | null }[]
}

export interface IntegrationActionInput {
  integrationId: string
  companyId: string
}
