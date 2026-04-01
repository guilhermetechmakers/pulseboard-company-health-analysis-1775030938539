import { IntegrationProviderCard } from '@/components/integrations/integration-provider-card'
import { INTEGRATION_PROVIDERS } from '@/types/integrations'
import type { IntegrationProvider } from '@/types/integrations'
import type { IntegrationRow } from '@/types/integrations'

export interface ConnectorCommonProps {
  companyId: string
  integrations: IntegrationRow[]
  onCsvFocus?: () => void
}

function pickIntegration(list: IntegrationRow[], provider: IntegrationProvider) {
  const arr = Array.isArray(list) ? list : []
  return arr.find((i) => i.provider === provider)
}

function meta(provider: IntegrationProvider) {
  const p = INTEGRATION_PROVIDERS.find((x) => x.id === provider)
  return {
    label: p?.label ?? provider,
    description: p?.description ?? '',
    scopes: Array.isArray(p?.scopes) ? p.scopes : [],
  }
}

export function QuickBooksConnector({ companyId, integrations, onCsvFocus }: ConnectorCommonProps) {
  const m = meta('quickbooks')
  return (
    <IntegrationProviderCard
      companyId={companyId}
      provider="quickbooks"
      label={m.label}
      description={m.description}
      scopes={m.scopes}
      integration={pickIntegration(integrations, 'quickbooks')}
      onCsvFocus={onCsvFocus}
    />
  )
}

export function GoogleAnalyticsConnector({ companyId, integrations, onCsvFocus }: ConnectorCommonProps) {
  const m = meta('ga4')
  return (
    <IntegrationProviderCard
      companyId={companyId}
      provider="ga4"
      label={m.label}
      description={m.description}
      scopes={m.scopes}
      integration={pickIntegration(integrations, 'ga4')}
      onCsvFocus={onCsvFocus}
    />
  )
}

export function LinkedInConnector({ companyId, integrations, onCsvFocus }: ConnectorCommonProps) {
  const m = meta('linkedin')
  return (
    <IntegrationProviderCard
      companyId={companyId}
      provider="linkedin"
      label={m.label}
      description={m.description}
      scopes={m.scopes}
      integration={pickIntegration(integrations, 'linkedin')}
      onCsvFocus={onCsvFocus}
    />
  )
}

export function StripeConnector({ companyId, integrations, onCsvFocus }: ConnectorCommonProps) {
  const m = meta('stripe')
  return (
    <IntegrationProviderCard
      companyId={companyId}
      provider="stripe"
      label={m.label}
      description={m.description}
      scopes={m.scopes}
      integration={pickIntegration(integrations, 'stripe')}
      onCsvFocus={onCsvFocus}
    />
  )
}

export function CsvUploadConnector({ companyId, integrations, onCsvFocus }: ConnectorCommonProps) {
  const m = meta('csv')
  return (
    <IntegrationProviderCard
      companyId={companyId}
      provider="csv"
      label={m.label}
      description={m.description}
      scopes={m.scopes}
      integration={pickIntegration(integrations, 'csv')}
      onCsvFocus={onCsvFocus}
    />
  )
}
